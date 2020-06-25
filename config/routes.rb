Rails.application.routes.draw do
  root 'static_pages#home'
  get  '/blog', to: 'static_pages#blog'
end
