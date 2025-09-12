from typing import Any, Dict

from rest_framework import serializers


class ScatterTaskSerializer(serializers.BaseSerializer):
    """Dynamic serializer that serializes `Task` objects into the shape requested by the
    scatter API. The requested mapping between API field names and task attribute / JSON
    keys is passed through the serializer context as ``requested``.
    """

    def to_representation(self, obj):  # type: ignore[override]
        requested: Dict[str, str] = self.context['requested']  # {"x": "embedding_x", ...}

        rep: Dict[str, Any] = {'id': obj.id}

        for api_name, native_key in requested.items():
            # Skip ``id`` if user redundantly sends it.
            if api_name == 'id':
                continue

            # First, try to resolve as a direct attribute on the Task instance (DB column)
            if hasattr(obj, native_key):
                rep[api_name] = getattr(obj, native_key)
            else:
                # Fallback to Task.data lookup (JSONField)
                value = obj.data.get(native_key)

                # Convert numeric fields to float as needed
                if api_name in ('x', 'y', 'r') and value is not None:
                    try:
                        rep[api_name] = float(value)
                    except (ValueError, TypeError):
                        rep[api_name] = value
                else:
                    rep[api_name] = value
        return rep
