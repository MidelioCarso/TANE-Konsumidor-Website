from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0017_siteprofile_mision_vision_images"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteprofile",
            name="valor_image_url",
            field=models.URLField(blank=True),
        ),
    ]
