from django.db import migrations, models

import tane_web.id_utils


class Migration(migrations.Migration):

    dependencies = [
        ("contacts", "0002_alter_contactmessage_id"),
    ]

    operations = [
        migrations.CreateModel(
            name="ComplaintSubmission",
            fields=[
                (
                    "id",
                    models.CharField(
                        default=tane_web.id_utils.generate_hashed_id,
                        editable=False,
                        max_length=24,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("full_name", models.CharField(max_length=120)),
                ("phone", models.CharField(max_length=30)),
                ("residence", models.CharField(max_length=200)),
                ("problem_description", models.TextField()),
                ("entity_name", models.CharField(max_length=180)),
                ("assistance_request", models.TextField()),
                (
                    "evidence_photo",
                    models.FileField(blank=True, null=True, upload_to="complaint_evidence/"),
                ),
                ("source_ip", models.GenericIPAddressField(blank=True, null=True)),
                ("is_read", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
