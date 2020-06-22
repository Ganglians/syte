require 'test_helper'

class StaticPagesControllerTest < ActionDispatch::IntegrationTest
  def setup
    # DRY what the titles share in common
    @base_title = "| Syte"
  end

  test "should get root" do
    get root_url # root is static pages > home
    assert_response :success
    assert_select "title", "Home #{@base_title}"
  end

  test "should get blog" do
    get static_pages_blog_url
    assert_response :success
    assert_select "title", "Blog #{@base_title}"
  end
end
