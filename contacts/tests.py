from unittest.mock import patch

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from .models import ComplaintSubmission


class ComplaintSubmissionApiTests(TestCase):
	endpoint = "/api/contacts/complaints/"

	def setUp(self):
		cache.clear()
		self.base_payload = {
			"full_name": "Maria da Silva",
			"phone": "77223344",
			"residence": "Dili",
			"problem_description": "Presu produto la tuir tabela.",
			"entity_name": "Supermerkadu Exemplo",
			"assistance_request": "Favor ajuda halo reklamasaun formal.",
			"website": "",
			"middle_name": "",
			"js_enabled": "1",
			"started_at": "0",
		}

	def test_submit_complaint_success(self):
		response = self.client.post(self.endpoint, self.base_payload, REMOTE_ADDR="10.10.10.10")

		self.assertEqual(response.status_code, 201)
		self.assertEqual(ComplaintSubmission.objects.count(), 1)
		self.assertIn("detail", response.json())

	def test_honeypot_submission_is_ignored(self):
		payload = {**self.base_payload, "website": "https://spam.example"}
		response = self.client.post(self.endpoint, payload, REMOTE_ADDR="10.10.10.11")

		self.assertEqual(response.status_code, 201)
		self.assertEqual(ComplaintSubmission.objects.count(), 0)

	def test_secondary_honeypot_submission_is_ignored(self):
		payload = {**self.base_payload, "middle_name": "bot-value"}
		response = self.client.post(self.endpoint, payload, REMOTE_ADDR="10.10.10.11")

		self.assertEqual(response.status_code, 201)
		self.assertEqual(ComplaintSubmission.objects.count(), 0)

	def test_invalid_file_type_is_rejected(self):
		invalid_file = SimpleUploadedFile(
			"proof.gif",
			b"GIF89a",
			content_type="image/gif",
		)
		payload = {**self.base_payload, "evidence_photo": invalid_file}
		response = self.client.post(self.endpoint, payload, REMOTE_ADDR="10.10.10.12")

		self.assertEqual(response.status_code, 400)
		self.assertEqual(ComplaintSubmission.objects.count(), 0)

	def test_phone_validation_rejects_invalid_value(self):
		payload = {**self.base_payload, "phone": "abc-@@"}
		response = self.client.post(self.endpoint, payload, REMOTE_ADDR="10.10.10.14")

		self.assertEqual(response.status_code, 400)
		self.assertEqual(ComplaintSubmission.objects.count(), 0)

	@patch("contacts.views.MIN_SECONDS_BETWEEN_SUBMISSIONS", 0)
	def test_duplicate_submission_is_ignored(self):
		first = self.client.post(self.endpoint, self.base_payload, REMOTE_ADDR="10.10.10.15")
		second = self.client.post(self.endpoint, self.base_payload, REMOTE_ADDR="10.10.10.15")

		self.assertEqual(first.status_code, 201)
		self.assertEqual(second.status_code, 200)
		self.assertEqual(ComplaintSubmission.objects.count(), 1)

	@patch("contacts.views.MIN_SECONDS_BETWEEN_SUBMISSIONS", 0)
	def test_rate_limit_blocks_excessive_submissions(self):
		for idx in range(5):
			payload = {**self.base_payload, "entity_name": f"Supermerkadu Exemplo {idx}"}
			response = self.client.post(self.endpoint, payload, REMOTE_ADDR="10.10.10.13")
			self.assertEqual(response.status_code, 201)

		sixth_payload = {**self.base_payload, "entity_name": "Supermerkadu Exemplo 6"}
		sixth_response = self.client.post(self.endpoint, sixth_payload, REMOTE_ADDR="10.10.10.13")
		self.assertEqual(sixth_response.status_code, 429)
		self.assertEqual(ComplaintSubmission.objects.count(), 5)
