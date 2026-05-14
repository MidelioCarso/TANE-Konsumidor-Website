from django.db import migrations


def keep_only_first_estrategia(apps, schema_editor):
    EstrategiaItem = apps.get_model('content', 'EstrategiaItem')
    items = list(EstrategiaItem.objects.order_by('display_order', 'id'))
    if len(items) <= 1:
        return

    keep = items[0]
    EstrategiaItem.objects.exclude(id=keep.id).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0014_singleton_history_cleanup'),
    ]

    operations = [
        migrations.RunPython(keep_only_first_estrategia, migrations.RunPython.noop),
    ]
