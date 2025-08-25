from django.conf import settings


def iterate_queryset(queryset, chunk_size=None):
    if chunk_size is None:
        chunk_size = settings.QS_ITERATOR_DEFAULT_CHUNK_SIZE

    if chunk_size <= 0:
        raise ValueError(f'chunk_size must be positive, got {chunk_size}')

    model = queryset.model
    pk_field = model._meta.pk.name

    all_ids = list(queryset.values_list(pk_field, flat=True))

    if not all_ids:
        return

    for i in range(0, len(all_ids), chunk_size):
        chunk_ids = all_ids[i : i + chunk_size]

        # Create a new queryset based on the original, preserving all optimizations:
        # annotations, select_related, prefetch_related, only/defer
        chunk_qs = queryset.filter(**{f'{pk_field}__in': chunk_ids})

        for obj in chunk_qs:
            yield obj
