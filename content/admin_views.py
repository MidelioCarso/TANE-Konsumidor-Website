import json
from datetime import date

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.storage import default_storage
from django.db import DataError, IntegrityError
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from contacts.models import ComplaintSubmission

from .models import (
    EstrategiaItem,
    KeyStakeholder,
    NewsItem,
    NewsTag,
    OrganizationHistory,
    Publication,
    PublicationTag,
    SiteProfile,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

GROUP_CONTENT_EDITOR = "content_editor"
GROUP_OFFICER_MODERATOR = "officer_moderator"
GROUP_STAFF = "staff"
GROUP_KEIXA_MANAGER = "keixa_manager"
ROLE_SUPER_ADMIN = "super_admin"
ROLE_NONE = "none"
ROLE_CHOICES = {ROLE_SUPER_ADMIN, "officer_moderator", "staff", ROLE_NONE}
SYSTEM_ROLE_GROUP_NAMES = {GROUP_OFFICER_MODERATOR, GROUP_STAFF, GROUP_CONTENT_EDITOR}
PROTECTED_GROUP_NAMES = {GROUP_OFFICER_MODERATOR, GROUP_STAFF, GROUP_CONTENT_EDITOR, GROUP_KEIXA_MANAGER}
User = get_user_model()


def _admin_capabilities(user):
    is_superadmin = bool(user.is_authenticated and user.is_superuser)
    in_content_group = bool(user.is_authenticated and user.groups.filter(name=GROUP_CONTENT_EDITOR).exists())
    in_officer_group = bool(
        user.is_authenticated
        and user.groups.filter(name=GROUP_OFFICER_MODERATOR).exists()
    )
    in_staff_group = bool(user.is_authenticated and user.groups.filter(name=GROUP_STAFF).exists())
    in_keixa_group = bool(user.is_authenticated and user.groups.filter(name=GROUP_KEIXA_MANAGER).exists())

    can_review_publish = is_superadmin or in_officer_group or in_content_group
    can_manage_content = can_review_publish or in_staff_group
    can_manage_keixas = is_superadmin or in_keixa_group or in_officer_group or in_staff_group or in_content_group
    can_manage_site_content = is_superadmin
    can_manage_users = is_superadmin
    can_access_django_admin = is_superadmin
    can_access_admin = is_superadmin or can_manage_content or can_manage_keixas

    role = "none"
    if is_superadmin:
        role = "super_admin"
    elif in_officer_group or in_content_group:
        role = "officer_moderator"
    elif in_staff_group:
        role = "staff"

    return {
        "role": role,
        "is_superadmin": is_superadmin,
        "can_access_admin": can_access_admin,
        "can_manage_content": can_manage_content,
        "can_review_publish": can_review_publish,
        "can_manage_keixas": can_manage_keixas,
        "can_manage_site_content": can_manage_site_content,
        "can_manage_users": can_manage_users,
        "can_access_django_admin": can_access_django_admin,
    }


def _normalized_role(value):
    role = str(value or "").strip().lower()
    if role not in ROLE_CHOICES:
        return None
    return role


def _ensure_group(name):
    group, _ = Group.objects.get_or_create(name=name)
    return group


def _role_for_user(user):
    if user.is_superuser:
        return ROLE_SUPER_ADMIN
    names = set(user.groups.values_list("name", flat=True))
    if GROUP_OFFICER_MODERATOR in names or GROUP_CONTENT_EDITOR in names:
        return "officer_moderator"
    if GROUP_STAFF in names:
        return "staff"
    return ROLE_NONE


def _apply_role_groups(user, role):
    user.groups.remove(*Group.objects.filter(name__in=SYSTEM_ROLE_GROUP_NAMES))
    if role == "officer_moderator":
        user.groups.add(_ensure_group(GROUP_OFFICER_MODERATOR))
    elif role == "staff":
        user.groups.add(_ensure_group(GROUP_STAFF))


def _safe_group_ids(raw_group_ids):
    if not isinstance(raw_group_ids, list):
        return []
    groups = Group.objects.filter(id__in=raw_group_ids)
    return [g.id for g in groups if g.name not in SYSTEM_ROLE_GROUP_NAMES]


def _require_admin(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)

    capabilities = _admin_capabilities(request.user)
    if not capabilities["can_access_admin"]:
        return JsonResponse({"error": "Access restricted to admin roles."}, status=403)
    return None


def _require_content_admin(request):
    guard = _require_admin(request)
    if guard:
        return guard
    capabilities = _admin_capabilities(request.user)
    if not capabilities["can_manage_content"]:
        return JsonResponse({"error": "Content permission required."}, status=403)
    return None


def _require_keixa_admin(request):
    guard = _require_admin(request)
    if guard:
        return guard
    capabilities = _admin_capabilities(request.user)
    if not capabilities["can_manage_keixas"]:
        return JsonResponse({"error": "Keixa permission required."}, status=403)
    return None

def _require_superadmin(request):
    """Return error response if user is not a superadmin, else None."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required."}, status=401)
    if not request.user.is_superuser:
        return JsonResponse({"error": "Access restricted to super admins."}, status=403)
    return None


def _serialize_news_admin(item):
    published_at = item.published_at
    if hasattr(published_at, "isoformat"):
        published_at_value = published_at.isoformat()
    elif published_at:
        published_at_value = str(published_at)
    else:
        published_at_value = None

    thumbnail_url = item.thumbnail_url or ""
    if thumbnail_url.startswith("http") and "/media/" in thumbnail_url:
        thumbnail_url = thumbnail_url[thumbnail_url.find("/media/"):]

    return {
        "id": item.id,
        "title": item.title,
        "summary": item.summary,
        "content": item.content,
        "thumbnail_url": thumbnail_url,
        "tags": [{"id": t.id, "name": t.name} for t in item.tags.all()],
        "published_at": published_at_value,
        "is_published": item.is_published,
        "review_status": item.review_status,
        "submitted_by": item.submitted_by.username if item.submitted_by else "",
        "reviewed_by": item.reviewed_by.username if item.reviewed_by else "",
        "reviewed_at": item.reviewed_at.isoformat() if item.reviewed_at else None,
        "created_at": item.created_at.isoformat(),
    }


def _parse_body(request):
    """Parse JSON body, return (data, error_response)."""
    try:
        return json.loads(request.body), None
    except (json.JSONDecodeError, ValueError):
        return None, JsonResponse({"error": "Invalid JSON body."}, status=400)


def _to_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _store_thumbnail_file(request):
    file_obj = request.FILES.get("thumbnail_file")
    if not file_obj:
        return ""
    saved_path = default_storage.save(f"news_thumbnails/{file_obj.name}", file_obj)
    return default_storage.url(saved_path)


def _store_profile_image_file(request):
    file_obj = request.FILES.get("about_image_file")
    if not file_obj:
        return ""
    saved_path = default_storage.save(f"profile_images/{file_obj.name}", file_obj)
    return default_storage.url(saved_path)


def _store_hero_image_file(request, file_key):
    """Store a hero image file uploaded under `file_key` in request.FILES."""
    file_obj = request.FILES.get(file_key)
    if not file_obj:
        return ""
    saved_path = default_storage.save(f"hero_images/{file_obj.name}", file_obj)
    return default_storage.url(saved_path)


@csrf_exempt
@require_http_methods(["POST"])
def admin_upload_image(request):
    """Upload an inline image for the rich-text editor. Returns {"url": ...}."""
    err = _require_content_admin(request)
    if err:
        return err

    file_obj = request.FILES.get("image")
    if not file_obj:
        return JsonResponse({"error": "No image file provided."}, status=400)

    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file_obj.content_type not in allowed:
        return JsonResponse({"error": "Unsupported file type. Use JPG, PNG, WEBP or GIF."}, status=400)

    saved_path = default_storage.save(f"news_images/{file_obj.name}", file_obj)
    url = default_storage.url(saved_path)
    return JsonResponse({"url": url})


def _extract_tag_ids(raw):
    if raw is None:
        return []
    if isinstance(raw, list):
        result = []
        for x in raw:
            if not x:
                continue
            text = str(x).strip()
            if not text:
                continue
            if "," in text:
                result.extend([part.strip() for part in text.split(",") if part.strip()])
            else:
                result.append(text)
        return result
    if isinstance(raw, str):
        text = raw.strip()
        if not text:
            return []
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return [x for x in parsed if x]
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
        if "," in text:
            return [part.strip() for part in text.split(",") if part.strip()]
        return [text]
    return []


def _parse_date_value(value, default=None):
    if value in (None, ""):
        return default
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return default
        if "T" in text:
            text = text.split("T", 1)[0]
        elif " " in text:
            text = text.split(" ", 1)[0]
        try:
            return date.fromisoformat(text)
        except ValueError:
            return default
    return default


def _serialize_complaint_admin(item):
    evidence_url = item.evidence_photo.url if item.evidence_photo else ""
    return {
        "id": item.id,
        "full_name": item.full_name,
        "phone": item.phone,
        "residence": item.residence,
        "problem_description": item.problem_description,
        "entity_name": item.entity_name,
        "assistance_request": item.assistance_request,
        "evidence_photo_url": evidence_url,
        "source_ip": item.source_ip,
        "status": item.status,
        "is_read": item.is_read,
        "created_at": item.created_at.isoformat(),
    }


def _serialize_admin_group(group):
    return {
        "id": group.id,
        "name": group.name,
        "user_count": group.user_set.count(),
    }


def _serialize_admin_user(user):
    role = _role_for_user(user)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email or "",
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "role": role,
        "groups": [{"id": g.id, "name": g.name} for g in user.groups.order_by("name")],
        "date_joined": user.date_joined.isoformat() if user.date_joined else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }


# ── Auth endpoints ─────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["GET"])
def admin_me(request):
    """Check current session authentication."""
    capabilities = _admin_capabilities(request.user)
    if request.user.is_authenticated and capabilities["can_access_admin"]:
        return JsonResponse({
            "authenticated": True,
            "username": request.user.username,
            "email": request.user.email,
            "is_superuser": request.user.is_superuser,
            "capabilities": capabilities,
        })
    return JsonResponse({"authenticated": False})


@csrf_exempt
@require_http_methods(["POST"])
def admin_login(request):
    """Authenticate and start an admin-role session."""
    data, err = _parse_body(request)
    if err:
        return err

    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return JsonResponse({"error": "Username and password are required."}, status=400)

    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"error": "Invalid credentials."}, status=401)

    capabilities = _admin_capabilities(user)
    if not capabilities["can_access_admin"]:
        return JsonResponse({"error": "Access restricted to admin roles."}, status=403)

    login(request, user)
    return JsonResponse({
        "authenticated": True,
        "username": user.username,
        "email": user.email,
        "is_superuser": user.is_superuser,
        "capabilities": capabilities,
    })


@csrf_exempt
@require_http_methods(["POST"])
def admin_logout(request):
    """End the current session."""
    logout(request)
    return JsonResponse({"ok": True})


@csrf_exempt
@require_http_methods(["GET"])
def admin_management_links(request):
    """Return absolute Django admin links for superadmin management pages."""
    guard = _require_admin(request)
    if guard:
        return guard

    capabilities = _admin_capabilities(request.user)
    if not capabilities["can_access_django_admin"]:
        return JsonResponse({"error": "Superadmin permission required."}, status=403)

    return JsonResponse(
        {
            "users_url": request.build_absolute_uri("/admin/auth/user/"),
            "groups_url": request.build_absolute_uri("/admin/auth/group/"),
        }
    )


@csrf_exempt
def admin_users_list(request):
    """GET users list | POST create user (superadmin only)."""
    guard = _require_superadmin(request)
    if guard:
        return guard

    if request.method == "GET":
        query = (request.GET.get("q") or "").strip()
        users = User.objects.prefetch_related("groups").order_by("-date_joined")
        if query:
            users = users.filter(
                Q(username__icontains=query)
                | Q(email__icontains=query)
                | Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
            )
        return JsonResponse({"users": [_serialize_admin_user(u) for u in users]})

    if request.method == "POST":
        data, err = _parse_body(request)
        if err:
            return err

        username = str(data.get("username") or "").strip()
        password = str(data.get("password") or "")
        email = str(data.get("email") or "").strip()
        role = _normalized_role(data.get("role", "staff"))

        if not username or not password:
            return JsonResponse({"error": "Username and password are required."}, status=400)
        if User.objects.filter(username=username).exists():
            return JsonResponse({"error": "Username already exists."}, status=400)
        if role is None:
            return JsonResponse({"error": "Invalid role value."}, status=400)

        is_superuser = _to_bool(data.get("is_superuser", False)) or role == ROLE_SUPER_ADMIN
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_active=_to_bool(data.get("is_active", True)),
            is_staff=is_superuser,
            is_superuser=is_superuser,
        )

        if is_superuser:
            _apply_role_groups(user, ROLE_NONE)
        else:
            _apply_role_groups(user, role)

        user.refresh_from_db()
        return JsonResponse({"user": _serialize_admin_user(user)}, status=201)

    return JsonResponse({"error": "Method not allowed."}, status=405)


@csrf_exempt
def admin_user_detail(request, user_id):
    """GET | PUT | DELETE user by id (superadmin only)."""
    guard = _require_superadmin(request)
    if guard:
        return guard

    try:
        user = User.objects.prefetch_related("groups").get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found."}, status=404)

    if request.method == "GET":
        return JsonResponse({"user": _serialize_admin_user(user)})

    if request.method in {"PUT", "PATCH", "POST"}:
        data, err = _parse_body(request)
        if err:
            return err

        role = None
        if "role" in data:
            role = _normalized_role(data.get("role"))
            if role is None:
                return JsonResponse({"error": "Invalid role value."}, status=400)

        if "username" in data:
            username = str(data.get("username") or "").strip()
            if not username:
                return JsonResponse({"error": "Username cannot be empty."}, status=400)
            if User.objects.exclude(id=user.id).filter(username=username).exists():
                return JsonResponse({"error": "Username already in use."}, status=400)
            user.username = username

        if "email" in data:
            user.email = str(data.get("email") or "").strip()

        if "is_active" in data:
            user.is_active = _to_bool(data.get("is_active"))
        if "is_superuser" in data:
            user.is_superuser = _to_bool(data.get("is_superuser"))

        if role == ROLE_SUPER_ADMIN:
            user.is_superuser = True

        user.is_staff = bool(user.is_superuser)

        new_password = str(data.get("password") or "")
        if new_password:
            user.set_password(new_password)

        user.save()

        if user.is_superuser:
            _apply_role_groups(user, ROLE_NONE)
        elif role is not None:
            _apply_role_groups(user, role)

        user.refresh_from_db()
        return JsonResponse({"user": _serialize_admin_user(user)})

    if request.method == "DELETE":
        if request.user.id == user.id:
            return JsonResponse({"error": "Cannot delete your own user."}, status=400)
        user.delete()
        return JsonResponse({"ok": True})

    return JsonResponse({"error": "Method not allowed."}, status=405)


@csrf_exempt
def admin_groups_list(request):
    """Groups are intentionally managed only in Django admin."""
    return JsonResponse(
        {"error": "Group management is restricted to Django admin."},
        status=403,
    )


@csrf_exempt
def admin_group_detail(request, group_id):
    """Groups are intentionally managed only in Django admin."""
    return JsonResponse(
        {"error": "Group management is restricted to Django admin."},
        status=403,
    )


# ── Stats ─────────────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["GET"])
def admin_stats(request):
    """Dashboard summary statistics."""
    guard = _require_admin(request)
    if guard:
        return guard

    total = NewsItem.objects.count()
    published = NewsItem.objects.filter(is_published=True).count()

    total_pubs = Publication.objects.count()
    total_complaints = ComplaintSubmission.objects.count()
    unread_complaints = ComplaintSubmission.objects.filter(is_read=False).count()
    pending_complaints = ComplaintSubmission.objects.filter(status=ComplaintSubmission.STATUS_PENDING).count()
    resolved_complaints = ComplaintSubmission.objects.filter(status=ComplaintSubmission.STATUS_RESOLVED).count()
    cancelled_complaints = ComplaintSubmission.objects.filter(status=ComplaintSubmission.STATUS_CANCELLED).count()
    return JsonResponse({
        "total_news": total,
        "published_news": published,
        "draft_news": total - published,
        "pending_news_reviews": NewsItem.objects.filter(review_status=NewsItem.REVIEW_PENDING).count(),
        "total_tags": NewsTag.objects.count(),
        "total_history": OrganizationHistory.objects.count(),
        "total_stakeholders": KeyStakeholder.objects.count(),
        "total_estrategia": EstrategiaItem.objects.count(),
        "total_publications": total_pubs,
        "published_publications": Publication.objects.filter(is_published=True).count(),
        "pending_publication_reviews": Publication.objects.filter(review_status=Publication.REVIEW_PENDING).count(),
        "total_complaints": total_complaints,
        "unread_complaints": unread_complaints,
        "pending_complaints": pending_complaints,
        "resolved_complaints": resolved_complaints,
        "cancelled_complaints": cancelled_complaints,
    })


@csrf_exempt
@require_http_methods(["GET"])
def admin_complaints_stats(request):
    """Summary counters for complaint dashboard/sidebar badges."""
    guard = _require_keixa_admin(request)
    if guard:
        return guard

    total = ComplaintSubmission.objects.count()
    pending = ComplaintSubmission.objects.filter(status=ComplaintSubmission.STATUS_PENDING).count()
    resolved = ComplaintSubmission.objects.filter(status=ComplaintSubmission.STATUS_RESOLVED).count()
    cancelled = ComplaintSubmission.objects.filter(status=ComplaintSubmission.STATUS_CANCELLED).count()
    unread = ComplaintSubmission.objects.filter(is_read=False).count()
    return JsonResponse(
        {
            "total": total,
            "pending": pending,
            "resolved": resolved,
            "cancelled": cancelled,
            "unread": unread,
        }
    )


# ── Complaint Submissions ─────────────────────────────────────────────────────

@csrf_exempt
def admin_complaints_list(request):
    """GET paginated/filtered complaints list."""
    guard = _require_keixa_admin(request)
    if guard:
        return guard

    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed."}, status=405)

    query = (request.GET.get("q") or "").strip()
    status = (request.GET.get("status") or "all").strip().lower()
    read_state = (request.GET.get("read_state") or "all").strip().lower()

    try:
        page = int(request.GET.get("page", "1"))
    except (TypeError, ValueError):
        page = 1

    try:
        per_page = int(request.GET.get("per_page", "10"))
    except (TypeError, ValueError):
        per_page = 10

    page = max(1, page)
    per_page = max(5, min(per_page, 100))

    queryset = ComplaintSubmission.objects.order_by("-created_at")

    if query:
        queryset = queryset.filter(
            Q(full_name__icontains=query)
            | Q(phone__icontains=query)
            | Q(residence__icontains=query)
            | Q(entity_name__icontains=query)
            | Q(problem_description__icontains=query)
        )

    if status == "read":
        queryset = queryset.filter(is_read=True)
    elif status == "unread":
        queryset = queryset.filter(is_read=False)
    elif status in {
        ComplaintSubmission.STATUS_PENDING,
        ComplaintSubmission.STATUS_RESOLVED,
        ComplaintSubmission.STATUS_CANCELLED,
    }:
        queryset = queryset.filter(status=status)

    if read_state == "read":
        queryset = queryset.filter(is_read=True)
    elif read_state == "unread":
        queryset = queryset.filter(is_read=False)

    total_items = queryset.count()
    total_pages = max(1, (total_items + per_page - 1) // per_page)
    page = min(page, total_pages)

    start = (page - 1) * per_page
    end = start + per_page
    items = queryset[start:end]

    return JsonResponse({
        "complaints": [_serialize_complaint_admin(item) for item in items],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
            "total_items": total_items,
        },
        "filters": {
            "q": query,
            "status": status,
            "read_state": read_state,
        },
    })


@csrf_exempt
def admin_complaint_detail(request, complaint_id):
    """GET | PUT | DELETE a single complaint submission."""
    guard = _require_keixa_admin(request)
    if guard:
        return guard

    try:
        complaint = ComplaintSubmission.objects.get(id=complaint_id)
    except ComplaintSubmission.DoesNotExist:
        return JsonResponse({"error": "Complaint not found."}, status=404)

    if request.method == "GET":
        return JsonResponse({"complaint": _serialize_complaint_admin(complaint)})

    if request.method in {"PUT", "POST", "PATCH"}:
        data, err = _parse_body(request)
        if err:
            return err

        update_fields = []
        if "is_read" in data:
            complaint.is_read = _to_bool(data.get("is_read"))
            update_fields.append("is_read")

        if "status" in data:
            next_status = str(data.get("status") or "").strip().lower()
            allowed_statuses = {
                ComplaintSubmission.STATUS_PENDING,
                ComplaintSubmission.STATUS_RESOLVED,
                ComplaintSubmission.STATUS_CANCELLED,
            }
            if next_status not in allowed_statuses:
                return JsonResponse({"error": "Invalid complaint status."}, status=400)
            complaint.status = next_status
            if next_status != ComplaintSubmission.STATUS_PENDING and "is_read" not in data:
                complaint.is_read = True
                update_fields.append("is_read")
            update_fields.append("status")

        if update_fields:
            complaint.save(update_fields=list(dict.fromkeys(update_fields)))

        return JsonResponse({"complaint": _serialize_complaint_admin(complaint)})

    if request.method == "DELETE":
        complaint.delete()
        return JsonResponse({"ok": True})

    return JsonResponse({"error": "Method not allowed."}, status=405)


# ── News CRUD ─────────────────────────────────────────────────────────────────

@csrf_exempt
def admin_news_list(request):
    """GET list of all news | POST create new news item."""
    guard = _require_content_admin(request)
    if guard:
        return guard

    if request.method == "GET":
        query = (request.GET.get("q") or "").strip()
        status = (request.GET.get("status") or "all").strip().lower()
        tag_id = (request.GET.get("tag") or "all").strip()

        try:
            page = int(request.GET.get("page", "1"))
        except (TypeError, ValueError):
            page = 1

        try:
            per_page = int(request.GET.get("per_page", "10"))
        except (TypeError, ValueError):
            per_page = 10

        if page < 1:
            page = 1
        per_page = max(5, min(per_page, 100))

        queryset = NewsItem.objects.prefetch_related("tags").order_by("-created_at")

        if query:
            queryset = queryset.filter(
                Q(title__icontains=query) | Q(summary__icontains=query)
            )

        if status == "published":
            queryset = queryset.filter(is_published=True)
        elif status == "draft":
            queryset = queryset.filter(is_published=False)
        elif status in {
            NewsItem.REVIEW_PENDING,
            NewsItem.REVIEW_APPROVED,
            NewsItem.REVIEW_REJECTED,
            NewsItem.REVIEW_DRAFT,
        }:
            queryset = queryset.filter(review_status=status)

        if tag_id and tag_id != "all":
            queryset = queryset.filter(tags__id=tag_id).distinct()

        total_items = queryset.count()
        total_pages = max(1, (total_items + per_page - 1) // per_page)
        page = min(page, total_pages)

        start = (page - 1) * per_page
        end = start + per_page
        items = queryset[start:end]

        return JsonResponse({
            "news": [_serialize_news_admin(i) for i in items],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
                "total_items": total_items,
            },
            "filters": {
                "q": query,
                "status": status,
                "tag": tag_id,
            },
        })

    if request.method == "POST":
        capabilities = _admin_capabilities(request.user)
        can_review_publish = capabilities["can_review_publish"]
        is_multipart = "multipart/form-data" in (request.content_type or "")
        if is_multipart:
            data = request.POST
            thumbnail_url = _store_thumbnail_file(request) or data.get("thumbnail_url", "").strip()
            tag_ids = _extract_tag_ids(request.POST.getlist("tag_ids") or request.POST.getlist("tag_ids[]"))
            published_at = _parse_date_value(data.get("published_at"), default=date.today())
            is_published = _to_bool(data.get("is_published", True))
        else:
            data, err = _parse_body(request)
            if err:
                return err
            thumbnail_url = data.get("thumbnail_url", "").strip()
            tag_ids = _extract_tag_ids(data.get("tag_ids", []))
            published_at = _parse_date_value(data.get("published_at"), default=date.today())
            is_published = _to_bool(data.get("is_published", True))

        if can_review_publish:
            review_status = NewsItem.REVIEW_APPROVED if is_published else NewsItem.REVIEW_DRAFT
            reviewed_by = request.user
            reviewed_at = timezone.now()
        else:
            review_status = NewsItem.REVIEW_PENDING
            is_published = False
            reviewed_by = None
            reviewed_at = None

        item = NewsItem.objects.create(
            title=data.get("title", "").strip(),
            summary=data.get("summary", "").strip(),
            content=data.get("content", ""),
            thumbnail_url=thumbnail_url,
            published_at=published_at,
            is_published=is_published,
            review_status=review_status,
            submitted_by=request.user,
            reviewed_by=reviewed_by,
            reviewed_at=reviewed_at,
        )

        if tag_ids:
            item.tags.set(NewsTag.objects.filter(id__in=tag_ids))

        return JsonResponse({"news": _serialize_news_admin(item)}, status=201)

    return JsonResponse({"error": "Method not allowed."}, status=405)


@csrf_exempt
def admin_news_detail(request, news_id):
    """GET | PUT | POST | DELETE a single news item."""
    guard = _require_content_admin(request)
    if guard:
        return guard

    try:
        item = NewsItem.objects.prefetch_related("tags").get(id=news_id)
    except NewsItem.DoesNotExist:
        return JsonResponse({"error": "News item not found."}, status=404)

    if request.method == "GET":
        return JsonResponse({"news": _serialize_news_admin(item)})

    if request.method in {"PUT", "POST"}:
        capabilities = _admin_capabilities(request.user)
        can_review_publish = capabilities["can_review_publish"]
        is_multipart = "multipart/form-data" in (request.content_type or "")
        if is_multipart:
            data = request.POST
            uploaded_thumbnail = _store_thumbnail_file(request)
            tag_ids = _extract_tag_ids(request.POST.getlist("tag_ids") or request.POST.getlist("tag_ids[]"))
            is_published = _to_bool(data.get("is_published", item.is_published))
            published_at_value = _parse_date_value(data.get("published_at"), default=None)
        else:
            data, err = _parse_body(request)
            if err:
                return err
            uploaded_thumbnail = ""
            tag_ids = _extract_tag_ids(data.get("tag_ids")) if "tag_ids" in data else None
            is_published = _to_bool(data.get("is_published", item.is_published))
            if "published_at" in data:
                published_at_value = _parse_date_value(data.get("published_at"), default=None)
            else:
                published_at_value = item.published_at

        item.title = data.get("title", item.title)
        item.summary = data.get("summary", item.summary)
        item.content = data.get("content", item.content)
        if uploaded_thumbnail:
            item.thumbnail_url = uploaded_thumbnail
        elif "thumbnail_url" in data:
            item.thumbnail_url = data.get("thumbnail_url", item.thumbnail_url)
        item.published_at = published_at_value

        if can_review_publish:
            item.is_published = is_published
            item.review_status = NewsItem.REVIEW_APPROVED if is_published else NewsItem.REVIEW_DRAFT
            item.reviewed_by = request.user
            item.reviewed_at = timezone.now()
        else:
            item.is_published = False
            item.review_status = NewsItem.REVIEW_PENDING
            if not item.submitted_by:
                item.submitted_by = request.user
            item.reviewed_by = None
            item.reviewed_at = None
        item.save()

        if is_multipart:
            item.tags.set(NewsTag.objects.filter(id__in=tag_ids))
        elif tag_ids is not None:
            item.tags.set(NewsTag.objects.filter(id__in=tag_ids))

        item.refresh_from_db()
        item.tags.all()  # re-prefetch
        return JsonResponse({"news": _serialize_news_admin(item)})

    if request.method == "DELETE":
        item.delete()
        return JsonResponse({"ok": True})

    return JsonResponse({"error": "Method not allowed."}, status=405)


# ── Tags ──────────────────────────────────────────────────────────────────────

@csrf_exempt
def admin_tags_list(request):
    """GET list of tags | POST create a tag."""
    guard = _require_content_admin(request)
    if guard:
        return guard

    if request.method == "GET":
        tags = NewsTag.objects.order_by("display_order", "name")
        return JsonResponse({"tags": [{"id": t.id, "name": t.name} for t in tags]})

    if request.method == "POST":
        data, err = _parse_body(request)
        if err:
            return err

        name = data.get("name", "").strip()
        if not name:
            return JsonResponse({"error": "Tag name is required."}, status=400)

        tag, created = NewsTag.objects.get_or_create(name=name)
        status_code = 201 if created else 200
        return JsonResponse({"tag": {"id": tag.id, "name": tag.name}}, status=status_code)

    return JsonResponse({"error": "Method not allowed."}, status=405)


# ── Site Profile (singleton) ──────────────────────────────────────────────────

@csrf_exempt
def admin_profile(request):
    """GET | PUT the single SiteProfile record."""
    guard = _require_superadmin(request)
    if guard:
        return guard

    profile = SiteProfile.objects.order_by("-updated_at").first()

    if request.method == "GET":
        if not profile:
            return JsonResponse({"profile": None})
        return JsonResponse({"profile": {
            "id": profile.id,
            "organization_name": profile.organization_name,
            "about_intro": profile.about_intro,
            "about_image_url": profile.about_image_url,
            "mision_image_url": profile.mision_image_url,
            "vision_image_url": profile.vision_image_url,
            "valor_image_url": profile.valor_image_url,
            "home_hero_image_url": profile.home_hero_image_url,
            "perfil_hero_image_url": profile.perfil_hero_image_url,
            "historia_hero_image_url": profile.historia_hero_image_url,
            "planu_hero_image_url": profile.planu_hero_image_url,
            "publication_hero_image_url": profile.publication_hero_image_url,
            "mision": profile.mision,
            "vision": profile.vision,
            "valor": profile.valor,
            "facebook_url": profile.facebook_url,
            "tiktok_url": profile.tiktok_url,
            "contact_email": profile.contact_email,
            "whatsapp_number": profile.whatsapp_number,
            "map_embed_url": profile.map_embed_url,
            "map_location_label": profile.map_location_label,
            "updated_at": profile.updated_at.isoformat(),
        }})

    if request.method in {"PUT", "POST"}:
        is_multipart = "multipart/form-data" in (request.content_type or "")
        if is_multipart:
            data = request.POST
            uploaded_image = _store_profile_image_file(request)
            uploaded_mision_image = _store_hero_image_file(request, "mision_image_file")
            uploaded_vision_image = _store_hero_image_file(request, "vision_image_file")
            uploaded_valor_image = _store_hero_image_file(request, "valor_image_file")
            uploaded_home_hero = _store_hero_image_file(request, "home_hero_image_file")
            uploaded_perfil_hero = _store_hero_image_file(request, "perfil_hero_image_file")
            uploaded_historia_hero = _store_hero_image_file(request, "historia_hero_image_file")
            uploaded_planu_hero = _store_hero_image_file(request, "planu_hero_image_file")
            uploaded_publication_hero = _store_hero_image_file(request, "publication_hero_image_file")
        else:
            data, err = _parse_body(request)
            if err:
                return err
            uploaded_image = ""
            uploaded_mision_image = ""
            uploaded_vision_image = ""
            uploaded_valor_image = ""
            uploaded_home_hero = ""
            uploaded_perfil_hero = ""
            uploaded_historia_hero = ""
            uploaded_planu_hero = ""
            uploaded_publication_hero = ""

        if not profile:
            profile = SiteProfile()

        profile.organization_name = data.get("organization_name", profile.organization_name or "TANE Konsumidor")
        profile.about_intro = data.get("about_intro", profile.about_intro or "")
        if uploaded_image:
            profile.about_image_url = uploaded_image
        elif "about_image_url" in data:
            profile.about_image_url = data.get("about_image_url", profile.about_image_url or "")
        if uploaded_mision_image:
            profile.mision_image_url = uploaded_mision_image
        elif "mision_image_url" in data:
            profile.mision_image_url = data.get("mision_image_url", profile.mision_image_url or "")
        if uploaded_vision_image:
            profile.vision_image_url = uploaded_vision_image
        elif "vision_image_url" in data:
            profile.vision_image_url = data.get("vision_image_url", profile.vision_image_url or "")
        if uploaded_valor_image:
            profile.valor_image_url = uploaded_valor_image
        elif "valor_image_url" in data:
            profile.valor_image_url = data.get("valor_image_url", profile.valor_image_url or "")
        if uploaded_home_hero:
            profile.home_hero_image_url = uploaded_home_hero
        elif "home_hero_image_url" in data:
            profile.home_hero_image_url = data.get("home_hero_image_url", profile.home_hero_image_url or "")
        if uploaded_perfil_hero:
            profile.perfil_hero_image_url = uploaded_perfil_hero
        elif "perfil_hero_image_url" in data:
            profile.perfil_hero_image_url = data.get("perfil_hero_image_url", profile.perfil_hero_image_url or "")
        if uploaded_historia_hero:
            profile.historia_hero_image_url = uploaded_historia_hero
        elif "historia_hero_image_url" in data:
            profile.historia_hero_image_url = data.get("historia_hero_image_url", profile.historia_hero_image_url or "")
        if uploaded_planu_hero:
            profile.planu_hero_image_url = uploaded_planu_hero
        elif "planu_hero_image_url" in data:
            profile.planu_hero_image_url = data.get("planu_hero_image_url", profile.planu_hero_image_url or "")
        if uploaded_publication_hero:
            profile.publication_hero_image_url = uploaded_publication_hero
        elif "publication_hero_image_url" in data:
            profile.publication_hero_image_url = data.get("publication_hero_image_url", profile.publication_hero_image_url or "")
        profile.mision = data.get("mision", profile.mision or "")
        profile.vision = data.get("vision", profile.vision or "")
        profile.valor = data.get("valor", profile.valor or "")
        profile.facebook_url = data.get("facebook_url", profile.facebook_url or "")
        profile.tiktok_url = data.get("tiktok_url", profile.tiktok_url or "")
        profile.contact_email = data.get("contact_email", profile.contact_email or "")
        profile.whatsapp_number = data.get("whatsapp_number", profile.whatsapp_number or "")
        profile.map_embed_url = data.get("map_embed_url", profile.map_embed_url or "")
        profile.map_location_label = data.get("map_location_label", profile.map_location_label or "")
        try:
            profile.save()
        except (DataError, IntegrityError, ValueError) as exc:
            return JsonResponse({"error": f"Dados inválidos iha perfil: {exc}"}, status=400)

        return JsonResponse({"profile": {
            "id": profile.id,
            "organization_name": profile.organization_name,
            "about_intro": profile.about_intro,
            "about_image_url": profile.about_image_url,
            "mision_image_url": profile.mision_image_url,
            "vision_image_url": profile.vision_image_url,
            "valor_image_url": profile.valor_image_url,
            "home_hero_image_url": profile.home_hero_image_url,
            "perfil_hero_image_url": profile.perfil_hero_image_url,
            "historia_hero_image_url": profile.historia_hero_image_url,
            "planu_hero_image_url": profile.planu_hero_image_url,
            "publication_hero_image_url": profile.publication_hero_image_url,
            "mision": profile.mision,
            "vision": profile.vision,
            "valor": profile.valor,
            "facebook_url": profile.facebook_url,
            "tiktok_url": profile.tiktok_url,
            "contact_email": profile.contact_email,
            "whatsapp_number": profile.whatsapp_number,
            "map_embed_url": profile.map_embed_url,
            "map_location_label": profile.map_location_label,
            "updated_at": profile.updated_at.isoformat(),
        }})

    return JsonResponse({"error": "Method not allowed."}, status=405)


# ── Organization History ───────────────────────────────────────────────────────

@csrf_exempt
def admin_history_list(request):
    """GET singleton history item as list | POST create first one only."""
    guard = _require_superadmin(request)
    if guard:
        return guard

    def _ser(i):
        return {"id": i.id, "title": i.title, "description": i.description, "display_order": i.display_order}

    base_qs = OrganizationHistory.objects.order_by("display_order", "title", "id")

    if request.method == "GET":
        first = base_qs.first()
        return JsonResponse({"history": ([_ser(first)] if first else [])})

    if request.method == "POST":
        existing = base_qs.first()
        if existing:
            return JsonResponse(
                {
                    "error": "Only one organization history is allowed.",
                    "history": _ser(existing),
                },
                status=400,
            )

        data, err = _parse_body(request)
        if err:
            return err
        item = OrganizationHistory.objects.create(
            title=data.get("title", "").strip(),
            description=data.get("description", "").strip(),
            display_order=data.get("display_order", 0),
        )
        return JsonResponse({"history": _ser(item)}, status=201)

    return JsonResponse({"error": "Method not allowed."}, status=405)


@csrf_exempt
def admin_history_detail(request, item_id):
    """GET | PUT | DELETE a single history item."""
    guard = _require_superadmin(request)
    if guard:
        return guard

    try:
        item = OrganizationHistory.objects.get(id=item_id)
    except OrganizationHistory.DoesNotExist:
        return JsonResponse({"error": "History item not found."}, status=404)

    def _ser(i):
        return {"id": i.id, "title": i.title, "description": i.description, "display_order": i.display_order}

    if request.method == "GET":
        return JsonResponse({"history": _ser(item)})

    if request.method == "PUT":
        data, err = _parse_body(request)
        if err:
            return err
        item.title = data.get("title", item.title)
        item.description = data.get("description", item.description)
        item.display_order = data.get("display_order", item.display_order)
        item.save()
        return JsonResponse({"history": _ser(item)})

    if request.method == "DELETE":
        item.delete()
        return JsonResponse({"ok": True})

    return JsonResponse({"error": "Method not allowed."}, status=405)


# ── Key Stakeholders ───────────────────────────────────────────────────────────

@csrf_exempt
def admin_stakeholders_list(request):
    """GET all stakeholders | POST create one."""
    guard = _require_superadmin(request)
    if guard:
        return guard

    def _ser(i):
        return {"id": i.id, "name": i.name, "title": i.title, "subtitle": i.subtitle, "display_order": i.display_order}

    if request.method == "GET":
        return JsonResponse({"stakeholders": [_ser(i) for i in KeyStakeholder.objects.order_by("display_order", "name")]})

    if request.method == "POST":
        data, err = _parse_body(request)
        if err:
            return err
        item = KeyStakeholder.objects.create(
            name=data.get("name", "").strip(),
            title=data.get("title", "").strip(),
            subtitle=data.get("subtitle", "").strip(),
            display_order=data.get("display_order", 0),
        )
        return JsonResponse({"stakeholder": _ser(item)}, status=201)

    return JsonResponse({"error": "Method not allowed."}, status=405)


@csrf_exempt
def admin_stakeholder_detail(request, item_id):
    """PUT | DELETE a single stakeholder."""
    guard = _require_superadmin(request)
    if guard:
        return guard

    try:
        item = KeyStakeholder.objects.get(id=item_id)
    except KeyStakeholder.DoesNotExist:
        return JsonResponse({"error": "Stakeholder not found."}, status=404)

    def _ser(i):
        return {"id": i.id, "name": i.name, "title": i.title, "subtitle": i.subtitle, "display_order": i.display_order}

    if request.method == "PUT":
        data, err = _parse_body(request)
        if err:
            return err
        item.name = data.get("name", item.name)
        item.title = data.get("title", item.title)
        item.subtitle = data.get("subtitle", item.subtitle)
        item.display_order = data.get("display_order", item.display_order)
        item.save()
        return JsonResponse({"stakeholder": _ser(item)})

    if request.method == "DELETE":
        item.delete()
        return JsonResponse({"ok": True})

    return JsonResponse({"error": "Method not allowed."}, status=405)


# ── Estrategia Items ───────────────────────────────────────────────────────────

@csrf_exempt
def admin_estrategia_list(request):
    """GET all estrategia items | POST create one."""
    guard = _require_superadmin(request)
    if guard:
        return guard

    def _ser(i):
        return {
            "id": i.id,
            "objetivu": i.objetivu_estratejiku,
            "atividade": i.atividade_estratejiku,
            "sasukat": i.sasukat_susesu_nian,
            "display_order": i.display_order,
        }

    if request.method == "GET":
        return JsonResponse({"estrategia": [_ser(i) for i in EstrategiaItem.objects.order_by("display_order")]})

    if request.method == "POST":
        data, err = _parse_body(request)
        if err:
            return err
        item = EstrategiaItem.objects.create(
            objetivu_estratejiku=data.get("objetivu", "").strip(),
            atividade_estratejiku=data.get("atividade", "").strip(),
            sasukat_susesu_nian=data.get("sasukat", "").strip(),
            display_order=data.get("display_order", 0),
        )
        return JsonResponse({"estrategia": _ser(item)}, status=201)

    return JsonResponse({"error": "Method not allowed."}, status=405)


@csrf_exempt
def admin_estrategia_detail(request, item_id):
    """GET | PUT | DELETE a single estrategia item."""
    guard = _require_superadmin(request)
    if guard:
        return guard

    try:
        item = EstrategiaItem.objects.get(id=item_id)
    except EstrategiaItem.DoesNotExist:
        return JsonResponse({"error": "Estrategia item not found."}, status=404)

    def _ser(i):
        return {
            "id": i.id,
            "objetivu": i.objetivu_estratejiku,
            "atividade": i.atividade_estratejiku,
            "sasukat": i.sasukat_susesu_nian,
            "display_order": i.display_order,
        }

    if request.method == "GET":
        return JsonResponse({"estrategia": _ser(item)})

    if request.method == "PUT":
        data, err = _parse_body(request)
        if err:
            return err
        item.objetivu_estratejiku = data.get("objetivu", item.objetivu_estratejiku)
        item.atividade_estratejiku = data.get("atividade", item.atividade_estratejiku)
        item.sasukat_susesu_nian = data.get("sasukat", item.sasukat_susesu_nian)
        item.display_order = data.get("display_order", item.display_order)
        item.save()
        return JsonResponse({"estrategia": _ser(item)})

    if request.method == "DELETE":
        item.delete()
        return JsonResponse({"ok": True})

    return JsonResponse({"error": "Method not allowed."}, status=405)


@csrf_exempt
def admin_tag_detail(request, tag_id):
    """DELETE a tag by id."""
    guard = _require_content_admin(request)
    if guard:
        return guard

    if request.method != "DELETE":
        return JsonResponse({"error": "Method not allowed."}, status=405)

    try:
        tag = NewsTag.objects.get(id=tag_id)
    except NewsTag.DoesNotExist:
        return JsonResponse({"error": "Tag not found."}, status=404)

    tag.delete()
    return JsonResponse({"ok": True})


# ── Publication Tags ───────────────────────────────────────────────────────────

@csrf_exempt
def admin_pub_tags_list(request):
    """GET list of publication tags | POST create one."""
    guard = _require_content_admin(request)
    if guard:
        return guard

    if request.method == "GET":
        tags = PublicationTag.objects.order_by("display_order", "name")
        return JsonResponse({"tags": [{"id": t.id, "name": t.name} for t in tags]})

    if request.method == "POST":
        data, err = _parse_body(request)
        if err:
            return err
        name = data.get("name", "").strip()
        if not name:
            return JsonResponse({"error": "Tag name is required."}, status=400)
        try:
            tag, created = PublicationTag.objects.get_or_create(name=name)
        except IntegrityError:
            tag = PublicationTag.objects.get(name=name)
            created = False
        return JsonResponse({"tag": {"id": tag.id, "name": tag.name}}, status=201 if created else 200)

    return JsonResponse({"error": "Method not allowed."}, status=405)


@csrf_exempt
def admin_pub_tag_detail(request, tag_id):
    """DELETE a publication tag."""
    guard = _require_content_admin(request)
    if guard:
        return guard

    if request.method != "DELETE":
        return JsonResponse({"error": "Method not allowed."}, status=405)

    try:
        tag = PublicationTag.objects.get(id=tag_id)
    except PublicationTag.DoesNotExist:
        return JsonResponse({"error": "Tag not found."}, status=404)

    tag.delete()
    return JsonResponse({"ok": True})


# ── Publications ───────────────────────────────────────────────────────────────

def _serialize_publication_admin(pub):
    """Serialize a Publication for admin response."""
    file_url = pub.file_url or ""
    if file_url.startswith("http") and "/media/" in file_url:
        file_url = file_url[file_url.find("/media/"):]
    cover_url = pub.cover_image_url or ""
    if cover_url.startswith("http") and "/media/" in cover_url:
        cover_url = cover_url[cover_url.find("/media/"):]
    return {
        "id": pub.id,
        "title": pub.title,
        "description": pub.description,
        "file_url": file_url,
        "cover_image_url": cover_url,
        "tags": [{"id": t.id, "name": t.name} for t in pub.tags.all()],
        "published_at": pub.published_at.isoformat() if pub.published_at else None,
        "is_published": pub.is_published,
        "review_status": pub.review_status,
        "submitted_by": pub.submitted_by.username if pub.submitted_by else "",
        "reviewed_by": pub.reviewed_by.username if pub.reviewed_by else "",
        "reviewed_at": pub.reviewed_at.isoformat() if pub.reviewed_at else None,
        "file_size": pub.file_size,
        "display_order": pub.display_order,
        "created_at": pub.created_at.isoformat(),
        "updated_at": pub.updated_at.isoformat(),
    }


def _store_publication_file(request):
    """Store uploaded PDF file and return (url, size_bytes)."""
    file_obj = request.FILES.get("publication_file")
    if not file_obj:
        return "", 0
    saved_path = default_storage.save(f"publications/{file_obj.name}", file_obj)
    url = default_storage.url(saved_path)
    return url, file_obj.size


def _store_pub_cover_file(request):
    """Store uploaded cover image for a publication."""
    file_obj = request.FILES.get("cover_image_file")
    if not file_obj:
        return ""
    saved_path = default_storage.save(f"publication_covers/{file_obj.name}", file_obj)
    return default_storage.url(saved_path)


@csrf_exempt
def admin_publications_list(request):
    """GET paginated/filtered publications | POST create one."""
    guard = _require_content_admin(request)
    if guard:
        return guard

    if request.method == "GET":
        query = (request.GET.get("q") or "").strip()
        status = (request.GET.get("status") or "all").strip().lower()
        tag_id = (request.GET.get("tag") or "all").strip()

        try:
            page = int(request.GET.get("page", "1"))
        except (TypeError, ValueError):
            page = 1
        try:
            per_page = int(request.GET.get("per_page", "10"))
        except (TypeError, ValueError):
            per_page = 10

        page = max(1, page)
        per_page = max(5, min(per_page, 100))

        qs = Publication.objects.prefetch_related("tags").order_by("display_order", "-published_at", "-created_at")

        if query:
            qs = qs.filter(Q(title__icontains=query) | Q(description__icontains=query))
        if status == "published":
            qs = qs.filter(is_published=True)
        elif status == "draft":
            qs = qs.filter(is_published=False)
        elif status in {
            Publication.REVIEW_PENDING,
            Publication.REVIEW_APPROVED,
            Publication.REVIEW_REJECTED,
            Publication.REVIEW_DRAFT,
        }:
            qs = qs.filter(review_status=status)
        if tag_id and tag_id != "all":
            qs = qs.filter(tags__id=tag_id).distinct()

        total_items = qs.count()
        total_pages = max(1, (total_items + per_page - 1) // per_page)
        page = min(page, total_pages)
        start = (page - 1) * per_page
        items = qs[start:start + per_page]

        return JsonResponse({
            "publications": [_serialize_publication_admin(p) for p in items],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
                "total_items": total_items,
            },
        })

    if request.method == "POST":
        capabilities = _admin_capabilities(request.user)
        can_review_publish = capabilities["can_review_publish"]
        is_multipart = "multipart/form-data" in (request.content_type or "")
        if is_multipart:
            data = request.POST
            file_url, file_size = _store_publication_file(request)
            cover_url = _store_pub_cover_file(request)
            tag_ids = _extract_tag_ids(request.POST.getlist("tag_ids") or request.POST.getlist("tag_ids[]"))
            published_at = _parse_date_value(data.get("published_at"), default=date.today())
            is_published = _to_bool(data.get("is_published", True))
            display_order = int(data.get("display_order", 0) or 0)
        else:
            data, err = _parse_body(request)
            if err:
                return err
            file_url, file_size = "", 0
            cover_url = data.get("cover_image_url", "").strip()
            tag_ids = _extract_tag_ids(data.get("tag_ids", []))
            published_at = _parse_date_value(data.get("published_at"), default=date.today())
            is_published = _to_bool(data.get("is_published", True))
            display_order = int(data.get("display_order", 0) or 0)

        if can_review_publish:
            review_status = Publication.REVIEW_APPROVED if is_published else Publication.REVIEW_DRAFT
            reviewed_by = request.user
            reviewed_at = timezone.now()
        else:
            review_status = Publication.REVIEW_PENDING
            is_published = False
            reviewed_by = None
            reviewed_at = None

        title = data.get("title", "").strip()
        if not title:
            return JsonResponse({"error": "Title is required."}, status=400)

        pub = Publication.objects.create(
            title=title,
            description=data.get("description", "").strip(),
            file_url=file_url,
            cover_image_url=cover_url,
            published_at=published_at,
            is_published=is_published,
            review_status=review_status,
            submitted_by=request.user,
            reviewed_by=reviewed_by,
            reviewed_at=reviewed_at,
            file_size=file_size,
            display_order=display_order,
        )
        if tag_ids:
            pub.tags.set(PublicationTag.objects.filter(id__in=tag_ids))

        return JsonResponse({"publication": _serialize_publication_admin(pub)}, status=201)

    return JsonResponse({"error": "Method not allowed."}, status=405)


@csrf_exempt
def admin_publication_detail(request, pub_id):
    """GET | PUT/POST | DELETE a single publication."""
    guard = _require_content_admin(request)
    if guard:
        return guard

    try:
        pub = Publication.objects.prefetch_related("tags").get(id=pub_id)
    except Publication.DoesNotExist:
        return JsonResponse({"error": "Publication not found."}, status=404)

    if request.method == "GET":
        return JsonResponse({"publication": _serialize_publication_admin(pub)})

    if request.method in {"PUT", "POST"}:
        capabilities = _admin_capabilities(request.user)
        can_review_publish = capabilities["can_review_publish"]
        is_multipart = "multipart/form-data" in (request.content_type or "")
        if is_multipart:
            data = request.POST
            uploaded_file, file_size = _store_publication_file(request)
            uploaded_cover = _store_pub_cover_file(request)
            tag_ids = _extract_tag_ids(request.POST.getlist("tag_ids") or request.POST.getlist("tag_ids[]"))
            is_published = _to_bool(data.get("is_published", pub.is_published))
            published_at = _parse_date_value(data.get("published_at"), default=pub.published_at)
            display_order = int(data.get("display_order", pub.display_order) or pub.display_order)
        else:
            data, err = _parse_body(request)
            if err:
                return err
            uploaded_file, file_size = "", 0
            uploaded_cover = ""
            tag_ids = _extract_tag_ids(data.get("tag_ids")) if "tag_ids" in data else None
            is_published = _to_bool(data.get("is_published", pub.is_published))
            published_at = _parse_date_value(data.get("published_at"), default=pub.published_at)
            display_order = int(data.get("display_order", pub.display_order) or pub.display_order)

        pub.title = data.get("title", pub.title).strip()
        pub.description = data.get("description", pub.description)
        if uploaded_file:
            pub.file_url = uploaded_file
            pub.file_size = file_size
        elif not is_multipart and "file_url" in data:
            pub.file_url = data["file_url"]
        if uploaded_cover:
            pub.cover_image_url = uploaded_cover
        elif not is_multipart and "cover_image_url" in data:
            pub.cover_image_url = data["cover_image_url"]
        pub.published_at = published_at

        if can_review_publish:
            pub.is_published = is_published
            pub.review_status = Publication.REVIEW_APPROVED if is_published else Publication.REVIEW_DRAFT
            pub.reviewed_by = request.user
            pub.reviewed_at = timezone.now()
        else:
            pub.is_published = False
            pub.review_status = Publication.REVIEW_PENDING
            if not pub.submitted_by:
                pub.submitted_by = request.user
            pub.reviewed_by = None
            pub.reviewed_at = None
        pub.display_order = display_order
        pub.save()

        if is_multipart:
            pub.tags.set(PublicationTag.objects.filter(id__in=tag_ids))
        elif tag_ids is not None:
            pub.tags.set(PublicationTag.objects.filter(id__in=tag_ids))

        pub.refresh_from_db()
        return JsonResponse({"publication": _serialize_publication_admin(pub)})

    if request.method == "DELETE":
        pub.delete()
        return JsonResponse({"ok": True})

    return JsonResponse({"error": "Method not allowed."}, status=405)