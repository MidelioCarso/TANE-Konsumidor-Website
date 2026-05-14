from django.urls import path

from .views import (
	about_content_api,
	footer_content_api,
	home_content_api,
	news_detail_api,
	news_content_api,
	profile_content_api,
	strategic_plan_api,
	work_content_api,
	publications_api,
	publication_detail_api,
)

urlpatterns = [
	path("home/", home_content_api, name="home-content-api"),
	path("profile/", profile_content_api, name="profile-content-api"),
	path("footer/", footer_content_api, name="footer-content-api"),
	path("news/", news_content_api, name="news-content-api"),
	path("news/<str:news_id>/", news_detail_api, name="news-detail-api"),
	# Publications
	path("publications/", publications_api, name="publications-api"),
	path("publications/<str:pub_id>/", publication_detail_api, name="publication-detail-api"),
	# Legacy aliases
	path("about/", about_content_api, name="about-content-api"),
	path("work/", work_content_api, name="work-content-api"),
	path("strategic-plan/", strategic_plan_api, name="strategic-plan-api"),
]
