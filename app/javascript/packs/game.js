"use strict";

/**
 * requestAnim shim layer by Paul Irish
 * Finds the first API that works to optimize the animation loop,
 * otherwise defaults to setTimeout().
 */
// window.requestAnimFrame = (function(){
//   return  window.requestAnimationFrame   ||
//       window.webkitRequestAnimationFrame ||
//       window.mozRequestAnimationFrame    ||
//       window.oRequestAnimationFrame      ||
//       window.msRequestAnimationFrame     ||
//       function(/* function */ callback, /* DOMElement */ element){
//         window.setTimeout(callback, 1000 / 60);
//       };
// })();

//*********************************LISTENERS***********************************
// Resizes game's canvas (A.K.A. 'gameArea') to dynamic page size (i.e. when 
// user changes their browser's size)
window.addEventListener("resize", function(event) {
  canvas = document.getElementById("game-canvas");

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
});

// Resize canvas from the get-go
window.addEventListener("load", function(event) { 
  canvas = document.getElementById("game-canvas");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});  

// Player token's controls 
// 'node' = 'window' in this case
window.addEventListener('keydown', function(event) {
  activeKeys[event.keyCode] = true; // Player presses a key, true in array
});

window.addEventListener('keyup', function(event) {
  activeKeys[event.keyCode] = false; // Player stops pressing key, false in array
});  

// *****************************GLOBAL VARIABLES*******************************
// Player token's name
var cassie = new playerToken(0, 0, 70, 70);
// Arguments presented as labeled parameters for clarity, the names 
// serve no purpose otherwise
// let inv = new invaders(totalInvaders = 8, {invaderWidth: 60, invaderHeight: 30}, 
//                        gapSpace = 30, velocity = 1, frameRate = 75);
var inv = new invaders(8, {invaderWidth: 60, invaderHeight: 30}, 30, 1, 75);
// Object list of key presses ('keydown'). False for unpressed or missing
var activeKeys = {};
var holding = '';

// Listeners' pertinent keycodes 
const Space      = 32; // i.e. The spacebar 
const ArrowLeft  = 37;
const ArrowUp    = 38;
const ArrowRight = 39;
const ArrowDown  = 40;

//BUG1 Keep track of frontmost player bullet's height
let playerBH = 0;
// let first = true;

// Stacked: Do not re-initialize invaders if already done before 
var invadersMem = false;
// Ensures game only starts every other click (start -> reset & stop -> start)
var go = true;

// Game canvas reference used throughout many object methods
// Canvas coordinates are as follows:
// (0,0) -- -- -- >(1,0)
//      |
//      |
//      |
//      V(0,1)

// Capture values when page loads
let canvas, ctx; // Set with 'init()' after page is loaded

let startLoop = false; // Starts/stops gameloop

// Keeps record of all shots/bullets
this.shotKeeper = new shotKeeper();

// Used to display frames per second
let timeStamp = 0;
let secondsPassed = 0, oldTimeStamp = 0, fps;
// TODO: Reset timeStamp(?)
let reqId; // Holds the requestId upon calling requestAnimationFrame

//******************************OBJECTS/FUNCTIONS******************************
// Images
// Load game sprites/images
var imgRepo = new function(nImages = 1) { // Singleton
  // IMAGE DEFINITIONS
  this.player_token = new Image();

  // IMAGE LOADING
  // Don't start game until all images are done loading
  this.nImages = nImages; let nLoaded = 0;
  let imgLoaded = function() {
    if(nLoaded ++ == nImages) {
      // window.init(); // Start game TODO: Create a title screen (and only load
                        // game when all images are loaded)
    }
  }

  this.player_token.onload = function() {
    imgLoaded(); // Increment total loaded images by one
  }
  // SET IMAGE SOURCES
  this.player_token.src = "/assets/token_cassie.svg";
};

// Renderer object
//MOVE DOWN below gamearea
var renderer = (function() { // Note: context = ctx for now, later, the 'context' 
                             // variable will be defined internally 
  function _drawRectangle(context, token) { // Generic rectangle
      ctx.fillStyle = token.color;
      ctx.globalAlpha = 0.7; // Opacity
      ctx.fillRect(token.x - token.width/2, token.y - token.height/2, token.width, token.height); // Rectangular
  }

  function _drawPlayer(context, token) { // render player token
    ctx.drawImage(imgRepo.player_token, token.x - token.width/2, token.y - token.height/2, token.width, token.height);
  }

  // WiP: No invader sprite yet. Draw as a plain token (a rectangle)
  function _drawInvader(context, token) { // render invader tokens
    _drawRectangle(context, token);
  }

  function _render() {
    // TODO: Move the gloval canvas variables here
    // var canvas = document.getElementById("game-canvas");
    var ctx = canvas.getContext("2d");

    // Example of a more C ++ approach to the loop:
    // var i,
    //     entity,
    //     entities = gameArea.entities(); // get tokens

    //     for(i = 0; i < entities.length; i ++) { // Drawing loop
    //       entity = entities[i];

    //       if(entity instanceof playerToken) {
    //         _drawPlayer(ctx, entity);
    //       }
    //     }

    // Draw game tokens
    gameArea.entities().forEach(function(entity) {
      if(!entity.collided) { // Intact tokens only
        if(entity instanceof playerToken) {
          _drawPlayer(ctx, entity);
        }
        else if(entity instanceof invaderToken) {
          _drawInvader(ctx, entity);
        }   
        else { // Default, rectangular polygon
          _drawRectangle(ctx, entity);
        }
      }
    });

    gameArea.shots().forEach(function(shot) {
      _drawRectangle(ctx, shot);
    });
  }

  function _clear() { // clear entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return { // Accessors
    render: _render, // Public method(s)
    clear:  _clear
  };

})();

// Use vectors for game physics (game is 2d for now)
var vector2d = function(x, y) {
  this.x = x;
  this.y = y;
}

// Vector functions
// Note: Vectors used as function arguments are not altered
function vectorAdd(v1, v2) {
  return new vector2d(v1.x + v2.x, v1.y + v2.y);
}

function vectorSubtract(v1, v2) {
  return new vector2d(v1.x - v2.x, v1.y - v2.y);
}

function vectorTimesScalar(v1, s) { // Multiply vector parts with a constant
  return new vector2d(v1.x * s, v2.x * s);
}

function vectorLength(v) { // Apply distance formula √(x^2 + y^2)
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function vectorNormal(v) { // Returns normalized vector
  let l = vectorLength(v);

  if(l == 0) { // Note: if l == 0, then don't divide by zero, this is very bad
    return null;
  }
  var reciprocal = 1 / vectorLength(v);

  return vectorTimesScalar(v, reciprocal);
}

var physics = (function () { //MOVE DOWN below gamearea
  // Updates 
  // TODO: Also handles collisions
  function _update() {
    gameArea.entities.forEach(function(entity) {
      // TODO: Need to implement both X and Y directions (only use one of those atm)
      // entity.y += entity.y.direction
      
    });
  }

  return {
    update: _update
  };

})();

// Contingency, structurally script will already run after page is loaded
window.onload = getCanvas; // onload event to set canvas variables
function getCanvas() {
  canvas = document.getElementById("game-canvas");
  ctx = canvas.getContext("2d");
}

// Function that toggles an HTML element's visibility
const toggle = (elem) => {
  // Adds or removes 'hidden' class to element
  elem.classList.toggle('hidden');
}

// Entirety of game's 'screen', where all the visible game pieces are
var gameArea = (function() { // Singleton
  // Hold all game tokens used in the game
  var _entities = []; // Holds all (generic) game tokens
  // ---------------------------------------------------------------------------
  // TODO:Attempt to separate game objects from their drawing and physics by
  // keeping their data here and implementing the other actions in two different
  // objects, in general can keep everything in one var, but for ease of use, 
  // separating the different types of game objects.
  
  // var _invaders =  []; // Holds all invaders
  var _invadarr = (function() { // 2d invader array
    //  a: {},  // Associative array, doesn't have built-in methods (ex. length())
    var a = [],
        f = [], // Invaders in the frontline (those allowed to shoot) 
        r = 0;  // total rows

    function _totCols(rowIndex) { // Total number of columns for given row
      if(rowIndex < this.r) {
        return this.a[rowIndex].length;
      }
      else {
        return false; // Out of bounds
      }
    }

    function _addRows(numOf) { // Add specific number of rows
      for(let i = 0; i < numOf; i ++) {
        this.a[this.r ++] = [];
      }
    }

    function _clear() {
      this.a = []; // Reset entire array content
      this.r = 0; // No rows on empty array
    }

    function _setup() {
      // Set up frontline invaders
      this.f = []; // erase previous values
      // let frontliners = this.a[this.r - 1];
      this.f = this.a[this.r - 1]; // Reset frontline to frontmost array

      // for(let i = 0; i < frontliners.length; i ++) {
      //   this.f.push(frontliners[i]);
      // }
    }

    return {
      totCols: _totCols, // method accessors
      addRows: _addRows,
      clear:   _clear,
      setup:   _setup,
      totRows: function() { return r; } // data accessors
    };
  })();

  var _shots  =  []; // Holds all bullets
//-----------------------------------------------------------------------------
  function _tog() {
    //BUG1
    if (go == true) { // Initiate game    
      go = false;
      startLoop = true;
      toggle(canvas); // Make canvas visible
      // Set demo text to indicate game is starting (for now, just to verify)
      document.getElementById("demo").innerHTML = "Game start";
      // Button text changed to indicate pressing again ends the game
      document.getElementById("play-button").innerHTML = "Stop";
      this.start(); // Set variables to start game
    } //BUG1 
    else { // End game, reset relevant variables
      // TODO: Reset timeStamp(?)
      timeStamp = 0;
      go = true;
      startLoop = false;
      // End game, press button again to "play" the game again (as of now, all
      // progress is lost after the currently existing hard reset)
      toggle(canvas); // Hide canvas
      document.getElementById("demo").innerHTML = "Game stop";
      document.getElementById("play-button").innerHTML = "Play";
      this.reset(); // Reset important variables
    }
  }

  //cassie = new playerToken(40, 40, red, window.innerWidth/2, window.innerHeight),
  function _start() {
    // PREP
    // Reset important variables

    // Update canvas
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    cassie.setup();

    //RELOCATION
    _entities.push(cassie);


    // Set up initial invader rows (use from stack if previous game played 
    // already)
    inv.setup();
    // Initialize structure that displays bullets (clears array)
    //shotKeeper.setup();

    // LOOP
    // Initiate gameLoop, request function gives the browser some air while 
    // looping and time the game loop to be in-sync with the browser repaint
    startLoop = true;
    window.requestAnimationFrame(gameLoop);
  }

  function _clear() { // Clears the whole canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function _reset() {
    // All settings and game components are at their starting values
    //this.clear(); // Might not need this here

    // clearInterval(this.interval); // nothing should be moving/responding
    // clearAnimationFrame(this.animationFrame);
    secondsPassed  = 0;
    oldTimeStamp   = 0;
    timeStamp      = 0; // TODO: Reset timeStamp(can it be done?)

    _shots    = [];
  }

  return { 
    tog:   _tog, // method accessors
    start: _start,
    clear: _clear,
    reset: _reset,
    entities: function() { return _entities; }, // data accessors
    invadarr: function() { return _invadarr; },
    shots:    function() { return _shots; }
  };
})();

function gameLoop(timeStamp) { // TODO: Reset timeStamp(?)
  if(!startLoop) {// Conditional that stops loop 
    return;
  }
  // [ 1 ] UPDATE
  secondsPassed = (timeStamp - oldTimeStamp)/1000;
  secondsPassed = Math.min(0.1, secondsPassed);
  oldTimeStamp  = timeStamp;

  // Calculate FPS (for the display)
  fps = Math.round(1/secondsPassed);

  cassie.update(secondsPassed);
  cassie.shoot(); // Update shotkeeper with any bullets player shot

  //WIP: Gonna edit invaders to move according to time passed
  inv.update();
  inv.shoot();

  shotKeeper.update();
  document.getElementById("bull").innerHTML = "bullets: " + gameArea.shots().length;

  // [ 2 ] COLLISION DETECTION
  // [Bullet => Check for collision]
  // TODO: Cassie (i.e. player token collision)
  // cassie.intersect(); 
  // [Bullets => iterate invaders]

  // Invader collision check (only first row for now)
  gameArea.invadarr().a.forEach(function(row, rind) { // row index
    row.forEach(function(invader, cind) { // column index
      shotKeeper.collisionCheck(invader);
      // WIP
      // If a backup invader exists, begins attacking after frontmost dies BULL1
      // if(invader.collision && rind > 0) {
      //   inv.invadarr.f[rind][cind] = inv.invadarr.a[rind - 1][cind];
      // }
    });
  });

  // [ 3 ] CLEAR
  renderer.clear();

  // [ 4 ] DRAW
  // cassie.draw(); // Relocation: moved to renderer
  renderer.render();
  framesPerSecond(); // Just a display //BUG1 - Displaying bullets for now
  // TODO: Reset timeStamp(?) Not sure if possible

  // Keep requesting further iterations of 'gameLoop' to animate game
  // TODO: Reset timeStamp(?)
  window.requestAnimationFrame(gameLoop);
}

function intersect(object1, object2) { // Checks if two rectangles intersect
  if (object2.x > object1.x + object1.width   || 
      object1.x > object2.x + object2.width   || 
      object2.y > object1.y + object1.height  || 
      object1.y > object2.y + object2.height) {

      return false;
  }

  return true;
}

// Abstract objects/classes
function rectangle(x = 0, y = 0, height = 1, width = 1) {
  // Constructor lines
  this.x      = x;
  this.y      = y;
  this.height = height;
  this.width  = width;
  // Recall canvas coordinates are as follows:
  //       w i d t h
  // (0,0) -- -- -- >(1,0)   X
  // h    | ████████
  // e    | ████████
  // i    | ████████
  // g    V(0,1)
  // h
  // t    Y

  this.left = function() {
    return this.x;
  }

  this.right = function() {
    return this.x + this.width;
  }

  this.top = function() {
    return this.y;
  }

  this.bottom = function() {
    return this.y + this.height;
  }

  this.intersect = function(thatRectangle) { // Checks if two rectangles intersect
      if(thatRectangle.left > this.right  ||
         this.left > thatRectangle.right  ||
         thatRectangle.top > this.bottom  ||
         this.top > thatRectangle.bottom) {

        return false;
      }

        return true;
  }
}

// Generic game token
function gameToken(x = 0, y = 0, width = 50, height = 70, xVelocity = 1, yVelocity = 1, collided = false, color = "blue") {
  this.x          = x;
  this.y          = y;
  this.width      = width;
  this.height     = height;
  // Object position in the (x, y) plane
  this.xVelocity  = xVelocity;
  this.yVelocity  = yVelocity;
  // Set collision boolean
  this.collided   = collided;
  this.color      = color;

  this.setup = function() { // Stub

  }

  this.update = function() { // Stub

  }

  this.hitBox = function() {
    // Hitbox around game token's center
    return new rectangle(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
  }
}

function invaderToken(x, y, width, height, xVelocity = 1, yVelocity = 1, collided = false, color = "blue", fireRate =  1 /*BUG1 fireRate*/) { //BULL1 
  // invaderToken inherits from more generic gameToken class
  gameToken.call(this, x, y, width, height, xVelocity, yVelocity, collided, color);
  this.prototype = Object.create(gameToken.prototype);
  Object.defineProperty(this, 'constructor', { 
      value: invaderToken, 
      enumerable: false, // So that it does not appear in 'for in' loop
      writable: true 
  });  

  // Constructor lines
  this.x         = x;
  this.y         = y;
  this.width     = width;
  this.height    = height;
  this.xVelocity = xVelocity;
  this.yVelocity = yVelocity;
  this.collided  = collided;
  this.color     = color;
  this.fireRate  = fireRate;

  var cooldown   = 0; // Time to wait until next shot is available
  var shotChance = 1; // % (chance of shot per movement)

  this.shoot = function () {
      cooldown += secondsPassed;

      if(cooldown > this.fireRate) {
        cooldown = 0;

        // TODO: Reintroduce 'randomized' shots at a later time
        // laChance is French for luck
        // let laChance = Math.floor(Math.random()*101);
        // if(laChance < shotChance) { //@BULL1
          // this.y + height + 1 to ensure bullet doesn't kill origin point  
          //____ fixing this will probably fix program, but the bullets seem to flow nicely atm            
          shotKeeper.addShot(
            /*x:*/            this.x, 
            /*y:*/            this.y + this.height/2 + 1,
            /*width:*/        5, 
            /*height:*/       10, 
            /*xVelocity:*/    1, 
            /*yVelocity:*/    125,
            /*collided:*/     false,
            /*color:*/        "orange");
        }
      // }
  }
}

function invaders(invaderCount = 1, 
                 {invaderWidth = 10, invaderHeight = 10}, 
                 gapSpace = 20, 
                 xVelocity  = 1, yVelocity  = 1, 
                 frameRate = 100) { // Makes invaders movement blocky (purposely)  

  this.invaderCount = invaderCount;
  // invadarr.c = invaderCount; // Number of invaders per row (read: columns)
  var vw = invaderWidth;
  var vh = invaderHeight;

  var b = gapSpace; // Space [ b ]etween each invader

  this.xVelocity = xVelocity;
  this.yVelocity = yVelocity;

  var frameUpper = frameRate;

  var frameNum = 0; // Marks the current frame you're on
  var vLeftmost, vRightmost;
  // var moveRight = true;
  // let xMagnitude = 1;
  // this.xMagnitude = xMagnitude;

  var wait = false; // 'turns' (frameRate) invaders must wait before moving again

  this.setup = function() {
    if(!invadersMem) {
      gameArea.invadarr().clear(); // Make sure invader array is clear (sanity check mostly)
      // invadarr.a = [];
    }

    frameNum = 0; // Start waiting time from 0

    // SETUP AND SPACING
    // Relative space between each invader
    // X Coordinate of next invader (accounting for previous width)
    let next = vw/2 + b;
    // Space between left most & rightmost invaders and the canvas boundary
    let edgeSpace = (canvas.width - invaderCount * vw - b * (invaderCount - 1))/2;
    //let step = edgeSpace/5; // Arbitrary (get to evenly go to edge)
    let drawAt = edgeSpace + invaderWidth/2; // Where to start invaders so group of them is centered
    let y = vw/2; // y positioning (increments of 50 at the moment)

    // EACH INDIVIDUAL INVADER
    if(!invadersMem) {
      gameArea.invadarr().addRows(2); // two rows
      // Populate with invaderCount number of invaders
      for(let i = 0; i < invaderCount; ++ i) {
        //BACK2
        // gameArea.invadarr().a[0].push(
        gameArea.invadarr().a[0].push(
                                new invaderToken(/*x:*/           drawAt,
                                                 /*y:*/           y, 
                                                 /*width:*/       vw, 
                                                 /*height:*/      vh,  
                                                 /*xVelocity:*/   0,
                                                 /*yVelocity:*/   0, 
                                                 /*collided:*/    false,
                                                 /*color:*/       "green",
                                                 /*fireRate*/     1));
        gameArea.entities().push(gameArea.invadarr().a[0][i]);
        // Another row in front of previous row (y + 50)
        gameArea.invadarr().a[1].push(
                                new invaderToken(/*x:*/           drawAt,
                                                 /*y:*/           y + 45, 
                                                 /*width:*/       vw, 
                                                 /*height:*/      vh,  
                                                 /*xVelocity:*/   0,
                                                 /*yVelocity:*/   0, 
                                                 /*collided:*/    false,
                                                 /*color:*/       "green",
                                                 /*fireRate*/     1));
        gameArea.entities().push(gameArea.invadarr().a[1][i]);
        drawAt += next;
      }
      invadersMem = true;
    }
    else { // Recycle invader array if it already existed
      gameArea.invadarr().a.forEach(function(row) {
        row.forEach(function(invader) {
          // Reset positioning and other pertinent values
          invader.x = drawAt;
          invader.y = y;
          drawAt += next;
          invader.collided = false; // All invaders intact
          invader.cooldown = 0; // Reset shot cooldown time
        });
        drawAt = edgeSpace;
        y += 45; // Y axis space for next row of invaders
      });
    }
    gameArea.invadarr().setup(); // Set frontliners array again

    // SPEED AND DIRECTION
    xVelocity  = 30;
    yVelocity  = 1;

    wait = false;
    // Reference for vaders on both ends of array
    vLeftmost  = gameArea.invadarr().a[0][0];
    vRightmost = gameArea.invadarr().a[0][gameArea.invadarr().a[0].length - 1];
    //vRightmost.xVelocity = 10; /*BUG1: magnitude = 30 */ // TODO: Replace vRightmost.magnitude with just an ordinary instance of magnitude (individual invaders might not need a speedboost defined, so it's wasted on them)
  }

  this.update = function() { // Update positioning
    if (frameNum ++ >= frameUpper) {
      frameNum = 0; // Reset frame

      if(wait) { // move 'forward' y axis by 10 pixels (? TODO: use yVelocity)
        gameArea.invadarr().a.forEach(function(row) {
          row.forEach(function(invader) {
            invader.y += 15;
          });
        });

        wait = false;
      }
      else {
        // Check left and right vader boundaries
        let dist  = xVelocity; // TODO * secondsPassed;
        let distR = vRightmost.x + dist;
        let distL = vLeftmost.x + dist;

        // Movement based on canvas boundary collisions
        // Right boundary of canvas
        if(distR + vRightmost.width/2 > canvas.width) { 
          xVelocity *= -1; // Change directions for next iteration
          // Calculate distance needed to reach rightmost canvas edge
          let finalDist = canvas.width - (vRightmost.x + vRightmost.width/2);

          // Move all invaders distance needed for rightmost invader to reach
          // canvas edge (and then move opposite direction in the next instance)
          gameArea.invadarr().a.forEach(function(row) {
            row.forEach(function(invader) {
              invader.x += finalDist;
            });
          });

          wait = true; // Make invaders wait at corner for two 'turns' (frameRate)
        }

        // Left boundary of canvas
        else if(distL - vLeftmost.width/2 < 0) { // would cross the left boundary    
          xVelocity *= -1;
          // move final distance to reach canvas' left boundary
           // calculate distance for leftmost to reach canvas boundary
          let finalDist = 0 - vLeftmost.x - vLeftmost.width/2;

          gameArea.invadarr().a.forEach(function(row) {
            row.forEach(function(invader) {
              invader.x += finalDist;
            });
          });

          wait = true;
        }
        else gameArea.invadarr().a.forEach(function(row) { // Advance like normal
          row.forEach(function(invader) {
            invader.x += dist;
          });
        });
      }
    }
  }

  this.shoot = function() {
    if(!wait) {
      gameArea.invadarr().f.forEach(function(frontliner) { // Frontmost invaders will shoot
        if(!frontliner.collided) {
//--------
            frontliner.shoot();
//--------            
        }
      });
    }
  }
}

// Optional: With inheritance, can add new properties at the end of 'fireRate'
function playerToken(x, y, width, height, xVelocity = 1000, yVelocity = 1, /* BULL1->xVelocity = 125*/ collided = false, color = "red", fireRate = .25) {
  // playerToken inherits from more generic gameToken class
  gameToken.call(this, x, y, width, height, xVelocity, yVelocity, collided, color);
  this.prototype = Object.create(gameToken.prototype);
  Object.defineProperty(this, 'constructor', {
      value: playerToken, 
      enumerable: false, // so that it does not appear in 'for in' loop
      writable: true 
  });

  this.x         = x;
  this.y         = y;
  this.width     = width;
  this.height    = height;
  this.xVelocity = xVelocity;
  this.yVelocity = yVelocity;
  this.collided  = collided;
  this.color     = color;
  this.fireRate  = fireRate;

  var cooldown = 0;

  this.setup = function() { // RELOCATION: Moving setup to renderer
    // Set up player token's positioning (bottom-center)
    // Subtracting(read: displacing) by player token dimensions to accomodate 
    // for token's size 
    this.x = canvas.width/2;
    this.y = canvas.height  - this.height/2;
  }

  this.update = function(secondsPassed) {
    // Variables tell what arrow keys are being pressed
    // canvas = document.getElementById("game-canvas");
    let right = activeKeys[ArrowRight];
    let left = activeKeys[ArrowLeft];
    // Directions left gets 'closer' to zero while right moves 'away'
    let leftWards = Math.abs(this.xVelocity) * -1;
    let rightWards = Math.abs(this.xVelocity);
    let movex; // might implement movey depending on game mechanics


    // Player token direction based on arrow keys
    if (left && !right) {
      holding = 'left';
      movex = leftWards;
    }
    if(!left && right) {
      holding = 'right';
      movex = rightWards;
    }
    if(left && right) { // Special case: player holds both arrows
      if(holding == 'right') { // Was holding right first
        movex = leftWards; // Choose left arbitrarily 
      }
      if(holding == 'left') { // Was holding left first
        movex = rightWards; // Most recent is right, so go right
      }
      if(holding == '') { // Edge case, pressed both at exact time, choose one
        holding = 'right';
        movex = rightWards; 
      }
    }
    if(!right && !left) {
      holding = ''; // Reset, player is not holding either
      movex = 0;
    }

    // (velocity = distance/time_passed) * const * time_passed = distance
    let dist = this.x + movex * secondsPassed;

    if(dist - this.width/2 == 0) { // Boundary

    }
    else if(dist - this.width/2 < 0) { // Boundary (move no further)
      this.x = this.width/2;
    }
    else if(dist + this.width/2 == canvas.width) { // Boundary
    }
    else if(dist + this.width/2 > canvas.width) { // Boundary (move back)
      this.x = canvas.width - this.width/2; 
    }
    else { // Move
      this.x = dist;
    }
  }

  this.shoot = function() {
    let space = activeKeys[Space]; // Press < space > to shoot
    cooldown += secondsPassed;
    if (space && cooldown > fireRate) { // Attempt at limiting bullets / sec
      cooldown = 0;
      // (x,y) displacement accomodates for token's dimensions
      // Shot originates from middle of token and travels up
      // Negative velocity because player's bullets go up
      // shotKeeper.addShot(5, 10, "yellow", this.x + width/2, this.y - height/2, 
      // Bullet spawns just above the player token 
      // 
      //  [ ]    Bullet height = Token height/2, spawns, a total distance of
      //         Token height/2 - 1 above player token without touching it
      // █████              |
      //   *(x, y) Center   | Token height 
      // █████              |
      shotKeeper.addShot(/*x:*/            this.x, 
                         /*y:*/            this.y - this.height - 1,
                         /*width:*/        5, 
                         /*height:*/       this.height/2, 
                         /*xVelocity:*/    0,  
                         /*yVelocity:*/    -500,
                         /*collided:*/     false,
                         /*color*/         "yellow");
    }
  }
}

// Is there a better way to define an object with properties? Because this 
// function will not be used as a data type or anything
function shotKeeper() { // Object in charge of keeping tabs on all bullets
  this.addShot = function(x = 70, y = 70, width = 5, height = 15, xVelocity = 0, yVelocity = 500, collided  = false, color = "blue") {
    // Given where bullet should spawn (x, y) but need to center the bullet
    // TODO: Make bullet spawn without touching player, account for this 
    // Can possibly circumvent this by differentiating player and invader
    // bullets
    this.x         = x + width/2;
    this.y         = y + height/2;
    this.width     = width;
    this.height    = height;
    this.xVelocity = xVelocity;
    this.yVelocity = yVelocity;
    this.collided  = collided;
    this.color     = color;
   
    gameArea.shots().push(new gameToken(this.x, this.y, this.width, this.height,
                            this.xVelocity, this.yVelocity, this.collided, this.color));
  }

  // Redefine clear/draw to render all the bullets. Probably though can use the
  // same kind of approach as invaders, defining a 'move' property. If so, then
  // I can DRY out the methods' code into a single function, and use said 
  // function in each object class!! <- may be unable to due to how certain
  // things move, and movement is simply adding/subtracting x and y. The draws
  // are already DRYed out
  this.update = function() {
    //TODO: Add collision check, remove if collision
    // Delete individual shot if it leaves canvas (cleanup)
    // Movement
    gameArea.shots().forEach(function(shot) {
      if(shot.y + shot.height/2 > canvas.height || shot.y - shot.height/2 < 0) { // Remove out of bounds
        gameArea.shots().splice(shot, 1); 
      }
      // **********************************************************************
      else { // advance
        shot.y += shot.yVelocity * secondsPassed;
      }
      // **********************************************************************
    });
  }

  this.collisionCheck = function(token) {
    // STANDBY3: Only pay attention to front row for now
    // let thisVader = invadarr.a[1][index]; // get value of invader in question

    gameArea.shots().forEach(function(shot) {
      let collides = intersect(shot, token); // Way to fix this (?)
      if (collides) {
        shot.collided = true;
        // Bullet and invader cancel each other
        // T0D0 ###############################################################
        // [Bullet => Invader intact?]
        // if(!token.collided) { 
        // if(!inv._getCollided(index)) {
        if(!token.collided) {
          gameArea.shots().splice(shot, 1); // Intact token disappears along with bullet
          // [Bullet => collision]
          // invadarr.a[1][index].collided = true;
          token.collided = true;
        }
      }
    });
  }
}

// ************************************Extra***********************************
function framesPerSecond() { // Displays fps on canvas
//   // Extra: Display FPS on canvas                  
  ctx.fillStyle = "rgba(0, 0, 0, 0)";
  ctx.fillRect(0, 0, 200, 100);
  ctx.font = '15px Arial';
  ctx.fillStyle = 'white';
  // ctx.fillText("Bullets: " +  shots.length);
  ctx.fillText("fps: " + fps, canvas.width - 50, canvas.height - 10);
  // ctx.fillText("playerBH: " + playerBH, canvas.width - 150, canvas.height - 50);
}