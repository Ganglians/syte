require 'test_helper'

class NavigationLinksTest < ActionDispatch::IntegrationTest
  test "navigation links" do
    # Go to the homepage
    get root_path
    assert_template "static_pages/home"

    # Check that all links are present
    assert_select "a[href=?]", "/assets/Resume.pdf"
    assert_select "a[href=?]", blog_path
    assert_select "a[href=?]", "http://github.com/ganglians"
    assert_select "a[href=?]", "http://linkedin.com/in/jccjr/"
  end
end
