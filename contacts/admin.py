from django.contrib import admin

from .models import ComplaintSubmission, ContactMessage


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


@admin.register(ContactMessage)
class ContactMessageAdmin(ShortHashedIDAdmin):
	list_display = ("short_id", "full_name", "email", "subject", "is_read", "created_at")
	list_filter = ("is_read", "created_at")
	search_fields = ("id", "full_name", "email", "subject")
	ordering = ("-created_at",)


@admin.register(ComplaintSubmission)
class ComplaintSubmissionAdmin(ShortHashedIDAdmin):
	list_display = ("short_id", "full_name", "phone", "entity_name", "status", "is_read", "created_at")
	list_filter = ("status", "is_read", "created_at")
	search_fields = ("id", "full_name", "phone", "entity_name", "residence")
	readonly_fields = ("source_ip",)
	ordering = ("-created_at",)
