from typing import Set, Tuple

DIRECT_DB_FIELDS: Set[str] = {
    # Native Task model database columns that can be returned directly without JSON lookup
    # Extend this set when new direct-access fields are needed by the frontend.
    'created_at',
    'completed_at',
    'updated_at',
    'id',  # although `id` is always fetched explicitly, keep for clarity
}

ALLOWED_API_PARAMS: Tuple[str, ...] = (
    'x',
    'y',
    'class',
    'text',
    'r',
    'image',
    'time',
)
