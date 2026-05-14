from django.db import models

from tane_web.id_utils import generate_hashed_id


class HashedIDModel(models.Model):
	id = models.CharField(
		primary_key=True,
		max_length=24,
		default=generate_hashed_id,
		editable=False,
	)

	class Meta:
		abstract = True


class ContactMessage(HashedIDModel):
	full_name = models.CharField(max_length=120)
	email = models.EmailField()
	phone = models.CharField(max_length=30, blank=True)
	subject = models.CharField(max_length=150)
	message = models.TextField()
	is_read = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-created_at"]

	def __str__(self):
		return f"{self.full_name} - {self.subject}"


class ComplaintSubmission(HashedIDModel):
	STATUS_PENDING = "pending"
	STATUS_RESOLVED = "resolved"
	STATUS_CANCELLED = "cancelled"
	STATUS_CHOICES = [
		(STATUS_PENDING, "Pending"),
		(STATUS_RESOLVED, "Resolved"),
		(STATUS_CANCELLED, "Cancelled"),
	]

	full_name = models.CharField(max_length=120)
	phone = models.CharField(max_length=30)
	residence = models.CharField(max_length=200)
	problem_description = models.TextField()
	entity_name = models.CharField(max_length=180)
	assistance_request = models.TextField()
	evidence_photo = models.FileField(upload_to="complaint_evidence/", blank=True, null=True)
	source_ip = models.GenericIPAddressField(blank=True, null=True)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
	is_read = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-created_at"]

	def __str__(self):
		return f"{self.full_name} - {self.entity_name}"
