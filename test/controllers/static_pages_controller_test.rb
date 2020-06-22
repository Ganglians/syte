require 'test_helper'

class StaticPagesControllerTest < ActionDispatch::IntegrationTest
  def setup
    # To avoid repetition, define part of the title referenced more than once
    @base_title = "| Syte"
  end

  test "should get home" do
    get static_pages_home_url
    assert_response :success
    assert_select "title", "Home #{@base_title}"
  end

  test "should get blog" do
    get static_pages_blog_url
    assert_response :success
    assert_select "title", "Blog #{@base_title}"
  end
end
