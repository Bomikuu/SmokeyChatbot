from django.urls import path

from . import views

urlpatterns = [
    path("auth/csrf", views.csrf),
    path("auth/signup", views.signup),
    path("auth/verify", views.verify),
    path("auth/login", views.login_view),
    path("auth/logout", views.logout_view),
    path("auth/me", views.me),
    path("owner/sites", views.sites),
    path("owner/sites/<uuid:site_id>", views.site_detail),
    path("owner/sites/<uuid:site_id>/asset", views.site_asset),
    path("owner/sites/<uuid:site_id>/sources", views.sources),
    path("owner/sites/<uuid:site_id>/sources/<int:source_id>", views.source_detail),
    path("owner/sites/<uuid:site_id>/usage", views.usage),
    path("widget/<uuid:site_id>/config", views.widget_config),
    path("widget/<uuid:site_id>/chat", views.widget_chat),
    path("widget/<uuid:site_id>/asset", views.widget_asset),
    path("widget/default-asset", views.default_asset),
    path("widget/script", views.widget_script),
]
