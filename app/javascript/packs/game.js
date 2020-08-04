// var square // Possibly for 2-D character model

// Activates when start button gets pressed in home page
function gameStart() {
  // Change what element contains inside
  document.getElementById("demo").innerHTML = "Game start";

// TODO: Create a canvas that covers whole page
// game_can = document.createElement("canvas");
// game_can.className = "game-can";

  // Test: create a nonempty paragraph element and append to hero-one
  var par = document.createElement("p");
  par.innerHTML = "Salutations!";
  document.getElementByClass("hero-one").appendChild(par);
}


//TODO: Create canvas that resizes with the window
// Resizes game's canvas to that of current view's size
// function resizeCanvas(){
//   canvas = document.getElementById("myCanvas");
//   if (canvas.width  < window.innerWidth) {
//       canvas.width  = window.innerWidth;
//   }

//   if (canvas.height < window.innerHeight) {
//       canvas.height = window.innerHeight;
//   }
// }

// window.addEventListener("resize", resizeCanvas);