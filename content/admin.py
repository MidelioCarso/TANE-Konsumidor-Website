from django.contrib import admin

from .models import (
	EstrategiaItem,
	KeyStakeholder,
	NewsGalleryImage,
	NewsItem,
	NewsTag,
	OrganizationHistory,
	SiteProfile,
)


class ShortHashedIDAdmin(admin.ModelAdmin):
	list_display_links = ("short_id",)

	@admin.display(description="ID", ordering="id")
	def short_id(self, obj):
		return obj.id[:8]

	def get_readonly_fields(self, request, obj=None):
		readonly_fields = tuple(super().get_readonly_fields(request, obj))
		if obj and "id" not in readonly_fields:
			return ("id", *readonly_fields)
		return readonly_fields


class NewsGalleryImageInline(admin.TabularInline):
	model = NewsGalleryImage
	extra = 1
	fields = ("image_url", "caption", "display_order")
	ordering = ("display_order",)


@admin.register(SiteProfile)
class SiteProfileAdmin(ShortHashedIDAdmin):
	list_display = ("short_id", "organization_name", "updated_at")
	search_fields = ("id", "organization_name")
	fieldsets = (
		(
			"Informasaun ONG",
			{"fields": ("organization_name",)},
		),
		(
			"Perfil Prinsipal (Misaun / Vizaun / Valor)",
			{"fields": ("mision", "vision", "valor")},
		),
	)


@admin.register(OrganizationHistory)
class OrganizationHistoryAdmin(ShortHashedIDAdmin):
	list_display = ("short_id", "title", "display_order")
	search_fields = ("id", "title", "description")
	ordering = ("display_order", "title")


@admin.register(NewsItem)
class NewsItemAdmin(ShortHashedIDAdmin):
	list_display = ("short_id", "title", "published_at", "is_published", "created_at")
	list_filter = ("is_published", "published_at", "tags")
	search_fields = ("id", "title", "summary")
	ordering = ("-published_at", "-created_at")
	filter_horizontal = ("tags",)
	inlines = (NewsGalleryImageInline,)
	fieldsets = (
		(
			"Notísia",
			{
				"fields": (
					"title",
					"summary",
					"content",
					"thumbnail_url",
					"tags",
				)
			},
		),
		(
			"Publikasaun",
			{"fields": ("published_at", "is_published")},
		),
	)


@admin.register(NewsTag)
class NewsTagAdmin(ShortHashedIDAdmin):
	list_display = ("short_id", "name", "display_order")
	search_fields = ("id", "name")
	ordering = ("display_order", "name")


@admin.register(NewsGalleryImage)
class NewsGalleryImageAdmin(ShortHashedIDAdmin):
	list_display = ("short_id", "news_item", "display_order")
	search_fields = ("id", "news_item__title", "caption")
	ordering = ("news_item", "display_order")


# ── Strategic Plan ────────────────────────────────────────────────────────────


@admin.register(KeyStakeholder)
class KeyStakeholderAdmin(ShortHashedIDAdmin):
	list_display = ("short_id", "name", "display_order")
	search_fields = ("id", "name")
	ordering = ("display_order", "name")


@admin.register(EstrategiaItem)
class EstrategiaItemAdmin(ShortHashedIDAdmin):
	list_display = ("short_id", "objetivu_estratejiku", "display_order")
	search_fields = ("id", "objetivu_estratejiku")
	ordering = ("display_order",)
