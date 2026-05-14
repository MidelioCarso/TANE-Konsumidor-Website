from django.urls import path

from .views import submit_complaint_api, submit_contact_message_api

urlpatterns = [
	path("messages/", submit_contact_message_api, name="submit-contact-message-api"),
	path("complaints/", submit_complaint_api, name="submit-complaint-api"),
]
