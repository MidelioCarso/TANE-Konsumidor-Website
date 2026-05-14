from django.urls import path, re_path

from .views import react_home

urlpatterns = [
	path("", react_home, name="react-home"),
	# Serve the React shell for every client-side route so refresh works
	re_path(r"^(?:home|about|work|contact)/?$", react_home, name="react-spa-catchall"),
	# Admin panel SPA routes
	re_path(r"^admin-panel(/.*)?$", react_home, name="react-admin-catchall"),
]
