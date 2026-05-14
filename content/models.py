from django.conf import settings
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


class SiteProfile(HashedIDModel):
	organization_name = models.CharField(max_length=150, default="TANE Konsumidor")
	about_intro = models.TextField(blank=True)
	about_image_url = models.URLField(blank=True)
	mision_image_url = models.URLField(blank=True)
	vision_image_url = models.URLField(blank=True)
	valor_image_url = models.URLField(blank=True)
	home_hero_image_url = models.URLField(blank=True)
	perfil_hero_image_url = models.URLField(blank=True)
	historia_hero_image_url = models.URLField(blank=True)
	planu_hero_image_url = models.URLField(blank=True)
	publication_hero_image_url = models.URLField(blank=True)
	mision = models.TextField()
	vision = models.TextField(blank=True)
	valor = models.TextField(blank=True)
	facebook_url = models.URLField(blank=True)
	tiktok_url = models.URLField(blank=True)
	contact_email = models.EmailField(blank=True)
	whatsapp_number = models.CharField(max_length=40, blank=True)
	map_embed_url = models.TextField(blank=True)
	map_location_label = models.CharField(max_length=180, blank=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		verbose_name = "Site Profile"
		verbose_name_plural = "Site Profile"

	def __str__(self):
		return self.organization_name


class OrganizationHistory(HashedIDModel):
	title = models.CharField(max_length=180)
	description = models.TextField()
	display_order = models.PositiveIntegerField(default=0)

	class Meta:
		ordering = ["display_order", "title"]
		verbose_name = "Organization history"
		verbose_name_plural = "Organization histories"

	def __str__(self):
		return self.title


class NewsItem(HashedIDModel):
	REVIEW_DRAFT = "draft"
	REVIEW_PENDING = "pending_review"
	REVIEW_APPROVED = "approved"
	REVIEW_REJECTED = "rejected"
	REVIEW_STATUS_CHOICES = [
		(REVIEW_DRAFT, "Draft"),
		(REVIEW_PENDING, "Pending Review"),
		(REVIEW_APPROVED, "Approved"),
		(REVIEW_REJECTED, "Rejected"),
	]

	title = models.CharField(max_length=180)
	summary = models.CharField(max_length=255)
	content = models.TextField(blank=True)
	thumbnail_url = models.URLField(blank=True)
	tags = models.ManyToManyField("NewsTag", related_name="news_items", blank=True)
	published_at = models.DateField(blank=True, null=True)
	is_published = models.BooleanField(default=True)
	review_status = models.CharField(max_length=20, choices=REVIEW_STATUS_CHOICES, default=REVIEW_DRAFT)
	submitted_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="submitted_news_items",
	)
	reviewed_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="reviewed_news_items",
	)
	reviewed_at = models.DateTimeField(blank=True, null=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-published_at", "-created_at"]
		verbose_name = "News item"
		verbose_name_plural = "News items"

	def __str__(self):
		return self.title


class NewsTag(HashedIDModel):
	name = models.CharField(max_length=60, unique=True)
	display_order = models.PositiveIntegerField(default=0)

	class Meta:
		ordering = ["display_order", "name"]
		verbose_name = "News tag"
		verbose_name_plural = "News tags"

	def __str__(self):
		return self.name


class NewsGalleryImage(HashedIDModel):
	news_item = models.ForeignKey(
		NewsItem,
		on_delete=models.CASCADE,
		related_name="gallery_images",
	)
	image_url = models.URLField()
	caption = models.CharField(max_length=180, blank=True)
	display_order = models.PositiveIntegerField(default=0)

	class Meta:
		ordering = ["display_order", "id"]
		verbose_name = "News gallery image"
		verbose_name_plural = "News gallery images"

	def __str__(self):
		return f"{self.news_item.title} - imagem {self.display_order}"


# ── Strategic Plan ────────────────────────────────────────────────────────────


class KeyStakeholder(HashedIDModel):
	name = models.CharField(max_length=180)
	title = models.CharField(max_length=120, blank=True, verbose_name="Títulu / Kategória")
	subtitle = models.TextField(blank=True, verbose_name="Subtítulu / Deskrisaun")
	display_order = models.PositiveIntegerField(default=0)

	class Meta:
		ordering = ["display_order", "name"]
		verbose_name = "Key Stakeholder"
		verbose_name_plural = "Key Stakeholders"

	def __str__(self):
		return self.name


# ── Publications ──────────────────────────────────────────────────────────────


class PublicationTag(HashedIDModel):
	name = models.CharField(max_length=100, unique=True)
	display_order = models.PositiveIntegerField(default=0)

	class Meta:
		ordering = ["display_order", "name"]
		verbose_name = "Publication tag"
		verbose_name_plural = "Publication tags"

	def __str__(self):
		return self.name


class Publication(HashedIDModel):
	REVIEW_DRAFT = "draft"
	REVIEW_PENDING = "pending_review"
	REVIEW_APPROVED = "approved"
	REVIEW_REJECTED = "rejected"
	REVIEW_STATUS_CHOICES = [
		(REVIEW_DRAFT, "Draft"),
		(REVIEW_PENDING, "Pending Review"),
		(REVIEW_APPROVED, "Approved"),
		(REVIEW_REJECTED, "Rejected"),
	]

	title = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	file_url = models.CharField(max_length=500, blank=True, help_text="Stored path to PDF file")
	cover_image_url = models.CharField(max_length=500, blank=True)
	tags = models.ManyToManyField(PublicationTag, related_name="publications", blank=True)
	published_at = models.DateField(blank=True, null=True)
	is_published = models.BooleanField(default=True)
	review_status = models.CharField(max_length=20, choices=REVIEW_STATUS_CHOICES, default=REVIEW_DRAFT)
	submitted_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="submitted_publications",
	)
	reviewed_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="reviewed_publications",
	)
	reviewed_at = models.DateTimeField(blank=True, null=True)
	file_size = models.PositiveIntegerField(default=0, help_text="File size in bytes")
	display_order = models.PositiveIntegerField(default=0)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["display_order", "-published_at", "-created_at"]
		verbose_name = "Publication"
		verbose_name_plural = "Publications"

	def __str__(self):
		return self.title


class EstrategiaItem(HashedIDModel):
	objetivu_estratejiku = models.CharField(
		max_length=255,
		verbose_name="Objetivu Estratejiku",
	)
	atividade_estratejiku = models.TextField(
		verbose_name="Atividade Estratejiku",
	)
	sasukat_susesu_nian = models.TextField(
		verbose_name="Sasukat Susesu nian",
	)
	display_order = models.PositiveIntegerField(default=0)

	class Meta:
		ordering = ["display_order"]
		verbose_name = "Estratejia item"
		verbose_name_plural = "Estratejia sira"

	def __str__(self):
		return self.objetivu_estratejiku
