from core.feature_flags import flag_set
from django.db import transaction
from fsm.managers import create_admin_context
from tasks.models import Annotation


def bulk_update_label(old_label, new_label, organization, project=None):
    annotations = Annotation.objects.filter(project__organization=organization)
    if project is not None:
        annotations = annotations.filter(project=project)

    updated_count = 0
    with transaction.atomic():
        update_annotations = []
        for annotation in annotations.only('result').all():
            result = annotation.result

            updated_result = []
            need_update = False
            for region in result:
                result_type = region.get('type')
                if result_type is not None:
                    label = region['value'].get(result_type)
                    if label is not None and label == old_label:
                        region['value'][result_type] = new_label
                        updated_count += 1
                        need_update = True
                updated_result.append(region)

            if need_update:
                annotation.result = updated_result
                update_annotations.append(annotation)

        if update_annotations:
            # Feature-flagged FSM context support
            # Use organization owner as fallback since this is an admin operation
            org_owner = organization.created_by
            if org_owner and flag_set('fflag_feat_fit_568_finite_state_management', user=org_owner):
                context = create_admin_context(
                    user_id=org_owner.id, organization_id=organization.id, operation='bulk_update_label_admin'
                )
                Annotation.objects.bulk_update_with_context(update_annotations, fields=['result'], context=context)
            else:
                Annotation.objects.bulk_update(update_annotations, ['result'])
    return updated_count
