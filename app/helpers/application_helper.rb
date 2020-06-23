module ApplicationHelper
  # Returns the full title on a per-page basis (or defaults)
  def full_title(page_title = '')
    base_title = "Syte"
    if page_title.empty?
      base_title
    else
      page_title + " | " + base_title
    end
  end
end
