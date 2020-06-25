require 'test_helper'

class StaticPagesControllerTest < ActionDispatch::IntegrationTest
  def setup
    # DRY what the titles share in common
    @base_title = "Syte"
  end

  # Paths
  test "should get default title" do
    # Send get request to static page controller's root route (defined as home 
    # in the router)
    get root_path
    assert_response :success
    # Test the title helper method
    assert_select "title", "#{@base_title}"
  end

  test "should get blog title" do
    get blog_path
    assert_response :success
    assert_select "title", "Blog | #{@base_title}"
  end
end
