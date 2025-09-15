import json
from openai import OpenAI
from django.conf import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def infer_mapping_from_json(raw_json: dict, expected_keys: list) -> dict:
    """
    Uses LLM to infer dot-notation paths from JSON for given expected keys.
    """
    prompt = f"""
You are a JSON path extractor.
Given this JSON:
{json.dumps(raw_json, indent=2)}

Find the dot-notation paths for the following keys: {expected_keys}.

Return ONLY a JSON object where each expected key maps to the correct dot path.
Example: {{ "product": "product", "image": "req.body.image" }}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    mapping_str = response.choices[0].message.content.strip()
    return json.loads(mapping_str)
