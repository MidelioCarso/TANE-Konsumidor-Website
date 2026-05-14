from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0018_siteprofile_valor_image"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteprofile",
            name="publication_hero_image_url",
            field=models.URLField(blank=True),
        ),
    ]
