from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0016_publication_publicationtag"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteprofile",
            name="mision_image_url",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="siteprofile",
            name="vision_image_url",
            field=models.URLField(blank=True),
        ),
    ]
