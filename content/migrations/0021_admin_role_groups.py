from django.db import migrations


def create_role_groups(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.get_or_create(name="officer_moderator")
    Group.objects.get_or_create(name="staff")


def noop_reverse(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0020_content_review_workflow"),
    ]

    operations = [
        migrations.RunPython(create_role_groups, noop_reverse),
    ]
