from django.db import migrations


def keep_only_first_history(apps, schema_editor):
    OrganizationHistory = apps.get_model('content', 'OrganizationHistory')
    items = list(OrganizationHistory.objects.order_by('display_order', 'title', 'id'))
    if len(items) <= 1:
        return

    keep = items[0]
    OrganizationHistory.objects.exclude(id=keep.id).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0013_profile_home_hero_image'),
    ]

    operations = [
        migrations.RunPython(keep_only_first_history, migrations.RunPython.noop),
    ]
