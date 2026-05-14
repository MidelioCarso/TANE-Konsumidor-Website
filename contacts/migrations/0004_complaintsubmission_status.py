from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contacts", "0003_complaintsubmission"),
    ]

    operations = [
        migrations.AddField(
            model_name="complaintsubmission",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("resolved", "Resolved"),
                    ("cancelled", "Cancelled"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
    ]
