result_example = [
    {
        'original_width': 1920,
        'original_height': 1080,
        'image_rotation': 0,
        'from_name': 'bboxes',
        'to_name': 'image',
        'type': 'rectanglelabels',
        'value': {
            'x': 20,
            'y': 30,
            'width': 50,
            'height': 60,
            'rotation': 0,
            'values': {'rectanglelabels': ['Person']},
        },
    }
]

task_response_example = {
    'id': 1,
    'data': {'image': 'https://example.com/image.jpg', 'text': 'Hello, AI!'},
    'project': 1,
    'created_at': '2024-06-18T23:45:46.048490Z',
    'updated_at': '2024-06-18T23:45:46.048538Z',
    'is_labeled': False,
    'overlap': 1,
    'inner_id': 1,
    'total_annotations': 0,
    'cancelled_annotations': 0,
    'total_predictions': 0,
    'comment_count': 0,
    'unresolved_comment_count': 0,
    'last_comment_updated_at': '2024-01-15T09:30:00Z',
    'updated_by': [{'user_id': 1}],
    'file_upload': '42d46c4c-my-pic.jpeg',
    'comment_authors': [1],
}

dm_task_response_example = {
    'id': 13,
    'predictions': [],
    'annotations': [],
    'drafts': [],
    'annotators': [],
    'inner_id': 2,
    'cancelled_annotations': 0,
    'total_annotations': 0,
    'total_predictions': 0,
    'completed_at': None,
    'annotations_results': '',
    'predictions_results': '',
    'predictions_score': None,
    'file_upload': '6b25fc23-some_3.mp4',
    'storage_filename': None,
    'annotations_ids': '',
    'predictions_model_versions': '',
    'avg_lead_time': None,
    'draft_exists': False,
    'updated_by': [],
    'data': {'image': '/data/upload/1/6b25fc23-some_3.mp4'},
    'meta': {},
    'created_at': '2024-06-18T23:45:46.048490Z',
    'updated_at': '2024-06-18T23:45:46.048538Z',
    'is_labeled': False,
    'overlap': 1,
    'comment_count': 0,
    'unresolved_comment_count': 0,
    'last_comment_updated_at': None,
    'project': 1,
    'comment_authors': [],
}

annotation_response_example = {
    'id': 1,
    'result': result_example,
    'task': 1,
    'project': 1,
    'completed_by': 1,
    'updated_by': 1,
    'was_cancelled': False,
    'ground_truth': False,
    'lead_time': 10,
}

prediction_response_example = {'id': 1, 'task': 1, 'result': result_example, 'score': 0.95, 'model_version': 'yolo-v8'}

task_request_schema = {
    'type': 'object',
    'properties': {
        'data': {'type': 'object'},
        'project': {'type': 'integer'},
    },
    'example': {
        'data': {'image': 'https://example.com/image.jpg', 'text': 'Hello, world!'},
        'project': 1,
    },
}

annotation_request_schema = {
    'type': 'object',
    'properties': {
        'result': {
            'type': 'array',
            'items': {'type': 'object'},
        },
        'task': {'type': 'integer'},
        'project': {'type': 'integer'},
        'completed_by': {'type': 'integer'},
        'updated_by': {'type': 'integer'},
        'was_cancelled': {'type': 'boolean'},
        'ground_truth': {'type': 'boolean'},
        'lead_time': {'type': 'number'},
    },
    'required': [],
    'example': {
        'result': result_example,
        'was_cancelled': False,
        'ground_truth': True,
    },
}

prediction_request_schema = {
    'type': 'object',
    'properties': {
        'task': {'type': 'integer'},
        'result': {
            'type': 'array',
            'items': {'type': 'object'},
        },
        'score': {'type': 'number'},
        'model_version': {'type': 'string'},
    },
    'example': {'result': result_example, 'score': 0.95, 'model_version': 'yolo-v8'},
}
