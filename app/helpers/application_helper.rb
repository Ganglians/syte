module ApplicationHelper
  # Formats title or returns base if none is provided
  def full_title(page_title = '')
    base_title = "Syte"
    if page_title.empty?
      base_title
    else
      page_title + " | " + base_title
    end
  end
end
