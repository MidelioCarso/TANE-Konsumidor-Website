from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import render
from django.db.models import Q

from .models import (
	EstrategiaItem,
	KeyStakeholder,
	NewsItem,
	OrganizationHistory,
	Publication,
	PublicationTag,
	SiteProfile,
)


def _get_profile_data(profile):
	if profile:
		return {
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
		}

	return {
		"organization_name": "TANE Konsumidor",
		"about_intro": (
			"TANE (Timor-Leste NGO for Consumer Empowerment) maka organizasaun "
			"la hetan lukru ne'ebé servisu atu proteje no empodera konsumidor iha "
			"Timor-Leste. Liuhusi defeza, edukasaun, no apoiu komunidade, ami luta "
			"atu garante direitu konsumidor nian hetan respeitu iha merkadu hotu-hotu."
		),
		"about_image_url": "",
		"mision_image_url": "",
		"vision_image_url": "",
		"valor_image_url": "",
		"home_hero_image_url": "",
		"perfil_hero_image_url": "",
		"historia_hero_image_url": "",
		"planu_hero_image_url": "",
		"publication_hero_image_url": "",
		"mision": (
			"TANE Konsumidor servisu atu proteje no empodera konsumidor "
			"liu husi defeza, edukasaun, no apoiu komunidade."
		),
		"vision": "",
		"valor": "",
		"facebook_url": "",
		"tiktok_url": "",
		"contact_email": "",
		"whatsapp_number": "",
		"map_embed_url": "",
		"map_location_label": "",
		"updated_at": None,
	}


def _serialize_histories(items):
	return [
		{
			"id": item.id,
			"title": item.title,
			"description": item.description,
		}
		for item in items
	]


def _serialize_gallery(images):
	return [
		{
			"id": image.id,
			"image_url": image.image_url,
			"caption": image.caption,
		}
		for image in images
	]


def _serialize_news(items, compact=False):
	return [
		{
			"id": item.id,
			"title": item.title,
			"summary": item.summary,
			"content": "" if compact else item.content,
			"image_url": item.thumbnail_url,
			"tags": [tag.name for tag in item.tags.all()],
			"gallery": [] if compact else _serialize_gallery(item.gallery_images.all()),
			"published_at": item.published_at.isoformat() if item.published_at else None,
		}
		for item in items
	]


def _get_strategic_plan_data():
	stakeholders = KeyStakeholder.objects.all()
	estrategias = EstrategiaItem.objects.all()

	return {
		"stakeholders": [
			{
				"id": stakeholder.id,
				"name": stakeholder.name,
				"title": stakeholder.title,
				"subtitle": stakeholder.subtitle,
			}
			for stakeholder in stakeholders
		],
		"objectives": [
			{
				"id": estrategia.id,
				"strategic_objective": estrategia.objetivu_estratejiku,
				"strategic_activity": estrategia.atividade_estratejiku,
				"success_measure": estrategia.sasukat_susesu_nian,
			}
			for estrategia in estrategias
		],
	}


def home_page(request):
	profile = SiteProfile.objects.order_by("-updated_at").first()
	profile_data = _get_profile_data(profile)

	return render(
		request,
		"content/home.html",
		{
			"organization_name": profile_data["organization_name"],
			"hero_title": "Direitu Konsumidor nian Importante",
			"mission_statement": profile_data["mision"],
			"hero_subtitle": "",
		},
	)


def home_content_api(request):
	profile = SiteProfile.objects.order_by("-updated_at").first()
	news_items = NewsItem.objects.filter(is_published=True).prefetch_related("tags", "gallery_images")[:6]
	strategic_plan = _get_strategic_plan_data()

	return JsonResponse(
		{
			"profile": _get_profile_data(profile),
			"strategic_plan": strategic_plan,
			"news": _serialize_news(news_items),
		}
	)


def profile_content_api(request):
	profile = SiteProfile.objects.order_by("-updated_at").first()
	history_item = OrganizationHistory.objects.order_by("display_order", "title", "id").first()
	strategic_plan = _get_strategic_plan_data()

	return JsonResponse(
		{
			"profile": _get_profile_data(profile),
			"history": _serialize_histories([history_item] if history_item else []),
			"strategic_plan": strategic_plan,
		}
	)


def news_content_api(request):
	query = (request.GET.get("q") or "").strip()
	tag = (request.GET.get("tag") or "").strip()
	exclude_id = (request.GET.get("exclude") or "").strip()
	related_for = (request.GET.get("related_for") or "").strip()
	compact = str(request.GET.get("compact", "")).strip().lower() in {"1", "true", "yes"}

	try:
		limit = int(request.GET.get("limit", "0") or "0")
	except (TypeError, ValueError):
		limit = 0

	limit = max(0, min(limit, 50))

	news_items = NewsItem.objects.filter(is_published=True).prefetch_related(
		"tags",
		"gallery_images",
	)

	if query:
		news_items = news_items.filter(
			Q(title__icontains=query) | Q(summary__icontains=query)
		)

	if tag:
		news_items = news_items.filter(tags__name=tag).distinct()

	if exclude_id:
		news_items = news_items.exclude(id=exclude_id)

	if related_for:
		base_item = NewsItem.objects.filter(is_published=True, id=related_for).prefetch_related("tags").first()
		if base_item:
			base_tags = list(base_item.tags.values_list("name", flat=True))
			related_qs = NewsItem.objects.filter(is_published=True).exclude(id=base_item.id)
			if base_tags:
				related_qs = related_qs.filter(tags__name__in=base_tags).distinct()
			related_qs = related_qs.prefetch_related("tags", "gallery_images")

			if limit > 0:
				related_items = list(related_qs[:limit])
				if len(related_items) < limit:
					fallback_qs = NewsItem.objects.filter(is_published=True).exclude(
						id__in=[base_item.id, *[x.id for x in related_items]],
					).prefetch_related("tags", "gallery_images")
					related_items.extend(list(fallback_qs[: limit - len(related_items)]))
				return JsonResponse({"news": _serialize_news(related_items, compact=compact)})

			return JsonResponse({"news": _serialize_news(related_qs, compact=compact)})

	if limit > 0:
		news_items = news_items[:limit]

	return JsonResponse(
		{
			"news": _serialize_news(news_items, compact=compact),
		}
	)


def news_detail_api(request, news_id):
	news_item = get_object_or_404(
		NewsItem.objects.filter(is_published=True).prefetch_related("tags", "gallery_images"),
		id=news_id,
	)

	return JsonResponse({"news": _serialize_news([news_item])[0]})


def strategic_plan_api(request):
	profile = SiteProfile.objects.order_by("-updated_at").first()
	profile_data = _get_profile_data(profile)
	strategic_plan = _get_strategic_plan_data()

	return JsonResponse(
		{
			"misaun": profile_data["mision"],
			"vizaun": profile_data["vision"],
			"valor": profile_data["valor"],
			**strategic_plan,
		}
	)


def footer_content_api(request):
	profile = SiteProfile.objects.order_by("-updated_at").first()
	profile_data = _get_profile_data(profile)

	return JsonResponse(
		{
			"footer": {
				"organization_name": profile_data["organization_name"],
				"facebook_url": profile_data["facebook_url"],
				"tiktok_url": profile_data["tiktok_url"],
				"contact_email": profile_data["contact_email"],
				"whatsapp_number": profile_data["whatsapp_number"],
				"map_embed_url": profile_data["map_embed_url"],
				"map_location_label": profile_data["map_location_label"],
			}
		}
	)

about_content_api = profile_content_api
work_content_api = news_content_api


# ── Publications (public) ─────────────────────────────────────────────────

def _serialize_pub_public(pub):
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
		"file_size": pub.file_size,
	}


def publications_api(request):
	query = (request.GET.get("q") or "").strip()
	tag_id = (request.GET.get("tag") or "").strip()
	try:
		page = max(1, int(request.GET.get("page", "1")))
	except (TypeError, ValueError):
		page = 1
	try:
		per_page = max(5, min(int(request.GET.get("per_page", "12")), 100))
	except (TypeError, ValueError):
		per_page = 12

	qs = Publication.objects.prefetch_related("tags").filter(is_published=True).order_by("display_order", "-published_at", "-created_at")

	if query:
		qs = qs.filter(Q(title__icontains=query) | Q(description__icontains=query))
	if tag_id:
		qs = qs.filter(tags__id=tag_id).distinct()

	total_items = qs.count()
	total_pages = max(1, (total_items + per_page - 1) // per_page)
	page = min(page, total_pages)
	start = (page - 1) * per_page
	items = qs[start:start + per_page]

	all_tags = [{"id": t.id, "name": t.name} for t in PublicationTag.objects.filter(publications__is_published=True).distinct().order_by("display_order", "name")]
	profile = SiteProfile.objects.order_by("-updated_at").first()
	hero_url = profile.publication_hero_image_url if profile else ""

	return JsonResponse({
		"publications": [_serialize_pub_public(p) for p in items],
		"hero_image_url": hero_url,
		"pagination": {
			"page": page,
			"per_page": per_page,
			"total_pages": total_pages,
			"total_items": total_items,
		},
		"tags": all_tags,
	})


def publication_detail_api(request, pub_id):
	try:
		pub = Publication.objects.prefetch_related("tags").get(id=pub_id, is_published=True)
	except Publication.DoesNotExist:
		from django.http import Http404
		raise Http404
	return JsonResponse({"publication": _serialize_pub_public(pub)})
