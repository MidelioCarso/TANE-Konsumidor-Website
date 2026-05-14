import json
import hashlib
import re
import time

from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import ComplaintSubmission, ContactMessage


RATE_LIMIT_WINDOW_SECONDS = 60 * 60
RATE_LIMIT_MAX_SUBMISSIONS = 5
MIN_SECONDS_BETWEEN_SUBMISSIONS = 20
DEDUPLICATION_WINDOW_SECONDS = 60 * 60 * 24
MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
PHONE_REGEX = re.compile(r"^[0-9+\-\s]{7,30}$")
MAX_TEXT_LENGTH = 2500
MIN_PROBLEM_TEXT_LENGTH = 20
MIN_ASSISTANCE_TEXT_LENGTH = 10
URL_REGEX = re.compile(r"(https?://|www\.)", re.IGNORECASE)


def _get_client_ip(request):
	forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
	if forwarded_for:
		return forwarded_for.split(",")[0].strip()
	return request.META.get("REMOTE_ADDR") or "unknown"


def _rate_limit_response(client_ip):
	last_submission_key = f"complaints:last:{client_ip}"
	hourly_count_key = f"complaints:count:{client_ip}"
	now_ts = time.time()

	last_submission_ts = cache.get(last_submission_key)
	if last_submission_ts and (now_ts - float(last_submission_ts)) < MIN_SECONDS_BETWEEN_SUBMISSIONS:
		return JsonResponse(
			{"detail": "Submete ida deit iha tempu badak. Favor hein minutu ida antes tenta fali."},
			status=429,
		)

	hourly_count = int(cache.get(hourly_count_key, 0))
	if hourly_count >= RATE_LIMIT_MAX_SUBMISSIONS:
		return JsonResponse(
			{"detail": "Demasiadu tentativa husi IP ida. Favor koko fali depois."},
			status=429,
		)

	cache.set(last_submission_key, now_ts, timeout=MIN_SECONDS_BETWEEN_SUBMISSIONS)
	cache.set(hourly_count_key, hourly_count + 1, timeout=RATE_LIMIT_WINDOW_SECONDS)
	return None


def _is_duplicate_submission(client_ip, full_name, phone, residence, problem_description, entity_name, assistance_request):
	fingerprint_raw = "|".join(
		[
			(client_ip or "").strip().lower(),
			full_name.strip().lower(),
			phone.strip().lower(),
			residence.strip().lower(),
			problem_description.strip().lower(),
			entity_name.strip().lower(),
			assistance_request.strip().lower(),
		]
	)
	fingerprint_hash = hashlib.sha256(fingerprint_raw.encode("utf-8")).hexdigest()
	cache_key = f"complaints:dedupe:{fingerprint_hash}"

	if cache.get(cache_key):
		return True

	cache.set(cache_key, "1", timeout=DEDUPLICATION_WINDOW_SECONDS)
	return False


@csrf_exempt
def submit_contact_message_api(request):
	if request.method != "POST":
		return JsonResponse({"detail": "Method not allowed."}, status=405)

	try:
		payload = json.loads(request.body.decode("utf-8"))
	except (json.JSONDecodeError, UnicodeDecodeError):
		return JsonResponse({"detail": "Invalid JSON payload."}, status=400)

	full_name = (payload.get("full_name") or "").strip()
	email = (payload.get("email") or "").strip()
	phone = (payload.get("phone") or "").strip()
	subject = (payload.get("subject") or "").strip()
	message = (payload.get("message") or "").strip()

	if not full_name or not email or not subject or not message:
		return JsonResponse(
			{"detail": "full_name, email, subject, and message are required."},
			status=400,
		)

	contact_message = ContactMessage.objects.create(
		full_name=full_name,
		email=email,
		phone=phone,
		subject=subject,
		message=message,
	)

	return JsonResponse(
		{
			"detail": "Message sent successfully.",
			"id": contact_message.id,
		},
		status=201,
	)


@csrf_exempt
def submit_complaint_api(request):
	if request.method != "POST":
		return JsonResponse({"detail": "Method not allowed."}, status=405)

	client_ip = _get_client_ip(request)
	honeypot = (request.POST.get("website") or "").strip()
	secondary_honeypot = (request.POST.get("middle_name") or "").strip()
	if honeypot or secondary_honeypot:
		# Return a normal response to bots, but silently ignore the payload.
		return JsonResponse({"detail": "Keixa simu ona. Obrigadu ba ita nia informasaun."}, status=201)

	started_at = (request.POST.get("started_at") or "").strip()
	js_enabled = (request.POST.get("js_enabled") or "0").strip()
	if started_at:
		try:
			filled_duration_seconds = (time.time() * 1000 - float(started_at)) / 1000
			min_fill_seconds = 3 if js_enabled == "1" else 6
			if filled_duration_seconds < min_fill_seconds:
				return JsonResponse({"detail": "Keixa simu ona. Obrigadu ba ita nia informasaun."}, status=201)
		except ValueError:
			pass

	rate_limit_error = _rate_limit_response(client_ip)
	if rate_limit_error is not None:
		return rate_limit_error

	full_name = (request.POST.get("full_name") or "").strip()
	phone = (request.POST.get("phone") or "").strip()
	residence = (request.POST.get("residence") or "").strip()
	problem_description = (request.POST.get("problem_description") or "").strip()
	entity_name = (request.POST.get("entity_name") or "").strip()
	assistance_request = (request.POST.get("assistance_request") or "").strip()
	evidence_photo = request.FILES.get("evidence_photo")

	required_values = [full_name, phone, residence, problem_description, entity_name, assistance_request]
	if any(not value for value in required_values):
		return JsonResponse(
			{"detail": "Favor kompleta pergunta obrigatoriu hotu antes submete."},
			status=400,
		)

	if len(full_name) > 120 or len(phone) > 30 or len(residence) > 200 or len(entity_name) > 180:
		return JsonResponse({"detail": "Iha kampu balu naruk liu limite permitidu."}, status=400)

	if not PHONE_REGEX.match(phone):
		return JsonResponse({"detail": "Numeru telefone invalidu. Uza deit numeru no simbolu + -."}, status=400)

	if len(problem_description) < MIN_PROBLEM_TEXT_LENGTH or len(assistance_request) < MIN_ASSISTANCE_TEXT_LENGTH:
		return JsonResponse({"detail": "Favor hatama deskrisaun klaru liu ba problema no pedidu ajuda."}, status=400)

	if len(problem_description) > MAX_TEXT_LENGTH or len(assistance_request) > MAX_TEXT_LENGTH:
		return JsonResponse({"detail": "Texto naruk liu limite permitidu."}, status=400)

	url_count = len(URL_REGEX.findall(problem_description)) + len(URL_REGEX.findall(assistance_request))
	if url_count >= 3:
		return JsonResponse({"detail": "Iha ligasaun (URL) barak demais iha keixa. Favor simplifika texto."}, status=400)

	if _is_duplicate_submission(
		client_ip,
		full_name,
		phone,
		residence,
		problem_description,
		entity_name,
		assistance_request,
	):
		return JsonResponse({"detail": "Keixa hanesan ida ne'e simu tiha ona iha loron ida ne'e."}, status=200)

	if evidence_photo:
		if evidence_photo.size > MAX_UPLOAD_SIZE_BYTES:
			return JsonResponse(
				{"detail": "Foto boot liu 5MB. Favor uza foto ne'ebe kiik liu."},
				status=400,
			)

		content_type = (evidence_photo.content_type or "").lower()
		if content_type not in ALLOWED_IMAGE_TYPES:
			return JsonResponse(
				{"detail": "Formatu foto la suportadu. Uza JPG, PNG, ka WEBP."},
				status=400,
			)

		filename = (evidence_photo.name or "").lower()
		if not any(filename.endswith(ext) for ext in ALLOWED_IMAGE_EXTENSIONS):
			return JsonResponse(
				{"detail": "Naran ficheiru tenke ho extensaun .jpg, .jpeg, .png, ka .webp."},
				status=400,
			)

	complaint = ComplaintSubmission.objects.create(
		full_name=full_name,
		phone=phone,
		residence=residence,
		problem_description=problem_description,
		entity_name=entity_name,
		assistance_request=assistance_request,
		evidence_photo=evidence_photo,
		source_ip=None if client_ip == "unknown" else client_ip,
	)

	return JsonResponse(
		{
			"detail": "Keixa submete ho susesu. Ekipa TANE sei analiza lalais.",
			"id": complaint.id,
		},
		status=201,
	)
