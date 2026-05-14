from django.urls import path

from .admin_views import (
    admin_login,
    admin_logout,
    admin_me,
    admin_news_detail,
    admin_news_list,
    admin_stats,
    admin_tags_list,
    admin_tag_detail,
    admin_profile,
    admin_history_list,
    admin_history_detail,
    admin_stakeholders_list,
    admin_stakeholder_detail,
    admin_estrategia_list,
    admin_estrategia_detail,
    admin_upload_image,
    admin_publications_list,
    admin_publication_detail,
    admin_pub_tags_list,
    admin_pub_tag_detail,
    admin_complaints_list,
    admin_complaint_detail,
    admin_complaints_stats,
    admin_management_links,
    admin_users_list,
    admin_user_detail,
    admin_groups_list,
    admin_group_detail,
)

urlpatterns = [
    path("me/", admin_me, name="admin-me"),
    path("login/", admin_login, name="admin-login"),
    path("logout/", admin_logout, name="admin-logout"),
    path("management-links/", admin_management_links, name="admin-management-links"),
    path("users/", admin_users_list, name="admin-users-list"),
    path("users/<int:user_id>/", admin_user_detail, name="admin-user-detail"),
    path("groups/", admin_groups_list, name="admin-groups-list"),
    path("groups/<int:group_id>/", admin_group_detail, name="admin-group-detail"),
    path("stats/", admin_stats, name="admin-stats"),
    # Media uploads
    path("upload-image/", admin_upload_image, name="admin-upload-image"),
    # News
    path("news/", admin_news_list, name="admin-news-list"),
    path("news/<str:news_id>/", admin_news_detail, name="admin-news-detail"),
    path("tags/", admin_tags_list, name="admin-tags-list"),
    path("tags/<str:tag_id>/", admin_tag_detail, name="admin-tag-detail"),
    # Profile
    path("profile/", admin_profile, name="admin-profile"),
    # History
    path("history/", admin_history_list, name="admin-history-list"),
    path("history/<str:item_id>/", admin_history_detail, name="admin-history-detail"),
    # Stakeholders
    path("stakeholders/", admin_stakeholders_list, name="admin-stakeholders-list"),
    path("stakeholders/<str:item_id>/", admin_stakeholder_detail, name="admin-stakeholder-detail"),
    # Estrategia
    path("estrategia/", admin_estrategia_list, name="admin-estrategia-list"),
    path("estrategia/<str:item_id>/", admin_estrategia_detail, name="admin-estrategia-detail"),
    # Publications
    path("publications/", admin_publications_list, name="admin-publications-list"),
    path("publications/<str:pub_id>/", admin_publication_detail, name="admin-publication-detail"),
    path("pub-tags/", admin_pub_tags_list, name="admin-pub-tags-list"),
    path("pub-tags/<str:tag_id>/", admin_pub_tag_detail, name="admin-pub-tag-detail"),
    # Complaints (Keixas)
    path("complaints/stats/", admin_complaints_stats, name="admin-complaints-stats"),
    path("complaints/", admin_complaints_list, name="admin-complaints-list"),
    path("complaints/<str:complaint_id>/", admin_complaint_detail, name="admin-complaint-detail"),
]
