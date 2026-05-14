import tane_web.id_utils
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0015_singleton_estrategia_cleanup'),
    ]

    operations = [
        migrations.CreateModel(
            name='PublicationTag',
            fields=[
                ('id', models.CharField(default=tane_web.id_utils.generate_hashed_id, editable=False, max_length=24, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, unique=True)),
                ('display_order', models.PositiveIntegerField(default=0)),
            ],
            options={
                'verbose_name': 'Publication tag',
                'verbose_name_plural': 'Publication tags',
                'ordering': ['display_order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='Publication',
            fields=[
                ('id', models.CharField(default=tane_web.id_utils.generate_hashed_id, editable=False, max_length=24, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('file_url', models.CharField(blank=True, help_text='Stored path to PDF file', max_length=500)),
                ('cover_image_url', models.CharField(blank=True, max_length=500)),
                ('tags', models.ManyToManyField(blank=True, related_name='publications', to='content.publicationtag')),
                ('published_at', models.DateField(blank=True, null=True)),
                ('is_published', models.BooleanField(default=True)),
                ('file_size', models.PositiveIntegerField(default=0, help_text='File size in bytes')),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Publication',
                'verbose_name_plural': 'Publications',
                'ordering': ['display_order', '-published_at', '-created_at'],
            },
        ),
    ]
