import csv

def flatten_json(y, prefix=''):
    """
    Recursively flattens JSON into dot paths.
    """
    out = {}
    if isinstance(y, dict):
        for k, v in y.items():
            new_key = f"{prefix}.{k}" if prefix else k
            out.update(flatten_json(v, new_key))
    elif isinstance(y, list):
        for i, v in enumerate(y):
            new_key = f"{prefix}[{i}]"
            out.update(flatten_json(v, new_key))
    else:
        out[prefix] = y
    return out


def build_mapping(sample_json, expected_keys):
    """
    Given JSON + expected keys, return mapping {key: dot_path}
    """
    flattened = flatten_json(sample_json)
    mapping = {}
    for path, value in flattened.items():
        for k in expected_keys:
            if path.endswith(k):
                mapping[k] = path
    return mapping


def save_mapping_csv(mapping, filepath):
    with open(filepath, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['key', 'path'])
        for k, p in mapping.items():
            writer.writerow([k, p])
