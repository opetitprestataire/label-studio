import json

import boto3
from django.test import TestCase
from io_storages.models import S3ImportStorage
from io_storages.s3.models import S3ImportStorageLink
from io_storages.tests.factories import (
    AzureBlobImportStorageFactory,
    GCSImportStorageFactory,
    RedisImportStorageFactory,
    S3ImportStorageFactory,
)
from io_storages.utils import StorageObjectParams, load_tasks_json
from moto import mock_s3
from projects.tests.factories import ProjectFactory
from rest_framework.test import APIClient

from tests.utils import azure_client_mock, gcs_client_mock, mock_feature_flag, redis_client_mock


class TestMultiTaskImport(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Setup project with simple config
        cls.project = ProjectFactory()

        # Common test data
        cls.common_task_data = [
            {'data': {'image_url': 'http://ggg.com/image.jpg', 'text': 'Task 1 text'}},
            {'data': {'image_url': 'http://ggg.com/image2.jpg', 'text': 'Task 2 text'}},
        ]

    @mock_feature_flag('fflag_feat_dia_2092_multitasks_per_storage_link', True)
    def _test_storage_import(self, storage_class, task_data, **storage_kwargs):
        """Helper to test import for a specific storage type"""

        # can't do this in the classmethod for some reason, or self.client != cls.client
        client = APIClient()
        client.force_authenticate(user=self.project.created_by)

        # Setup storage with required credentials
        storage = storage_class(project=self.project, **storage_kwargs)

        # Validate connection before sync
        try:
            storage.validate_connection()
        except Exception as e:
            self.fail(f'Storage connection validation failed: {str(e)}')

        # Sync storage
        # Don't have to wait for sync to complete because it's blocking without rq
        storage.sync()

        # Validate tasks were imported correctly
        tasks_response = client.get(f'/api/tasks?project={self.project.id}')
        self.assertEqual(tasks_response.status_code, 200)
        tasks = tasks_response.json()['tasks']
        self.assertEqual(len(tasks), len(task_data))

        # Validate task content
        for task, expected_data in zip(tasks, task_data):
            self.assertEqual(task['data'], expected_data['data'])

    def test_import_multiple_tasks_s3(self):
        with mock_s3():
            # Setup S3 bucket and test data
            s3 = boto3.client('s3', region_name='us-east-1')
            bucket_name = 'pytest-s3-jsons'
            s3.create_bucket(Bucket=bucket_name)

            # Put test data into S3
            s3.put_object(Bucket=bucket_name, Key='test.json', Body=json.dumps(self.common_task_data))

            self._test_storage_import(
                S3ImportStorageFactory,
                self.common_task_data,
                bucket='pytest-s3-jsons',
                aws_access_key_id='example',
                aws_secret_access_key='example',
                use_blob_urls=False,
            )

    def test_import_multiple_tasks_gcs(self):
        # initialize mock with sample data
        with gcs_client_mock():

            self._test_storage_import(
                GCSImportStorageFactory,
                self.common_task_data,
                # magic bucket name to set correct data in gcs_client_mock
                bucket='multitask_JSON',
                use_blob_urls=False,
            )

    def test_import_multiple_tasks_azure(self):
        # initialize mock with sample data
        with azure_client_mock(sample_json_contents=self.common_task_data, sample_blob_names=['test.json']):

            self._test_storage_import(
                AzureBlobImportStorageFactory,
                self.common_task_data,
                use_blob_urls=False,
            )

    def test_import_multiple_tasks_redis(self):
        with redis_client_mock() as redis:

            redis.set('test.json', json.dumps(self.common_task_data))

            self._test_storage_import(
                RedisImportStorageFactory,
                self.common_task_data,
                path='',
                use_blob_urls=False,
            )

    def test_storagelink_fields(self):
        # use an actual storage and storagelink to test this, since factories aren't connected properly
        with mock_s3():
            # Setup S3 bucket and test data
            s3 = boto3.client('s3', region_name='us-east-1')
            bucket_name = 'pytest-s3-jsons'
            s3.create_bucket(Bucket=bucket_name)

            # Put test data into S3
            s3.put_object(Bucket=bucket_name, Key='test.json', Body=json.dumps(self.common_task_data))

            # create a real storage and sync it
            storage = S3ImportStorage(
                project=self.project,
                bucket=bucket_name,
                aws_access_key_id='example',
                aws_secret_access_key='example',
                use_blob_urls=False,
            )
            storage.save()
            storage.sync()

            # check that the storage link fields are set correctly
            storage_links = S3ImportStorageLink.objects.filter(storage=storage).order_by('task_id')
            self.assertEqual(storage_links[0].row_index, 0)
            self.assertEqual(storage_links[0].row_group, None)
            self.assertEqual(storage_links[1].row_index, 1)
            self.assertEqual(storage_links[1].row_group, None)


class TestTaskFormats(TestCase):

    bare_task_list = [
        {
            'text': 'Test task 1',
        },
        {
            'text': 'Test task 2',
        },
    ]

    annots_preds_task_list = [
        {
            'data': {'text': 'Machine learning models require high-quality labeled data.'},
            'annotations': [
                {
                    'result': [
                        {
                            'value': {'start': 0, 'end': 22, 'text': 'Machine learning models', 'labels': ['FIELD']},
                            'from_name': 'label',
                            'to_name': 'text',
                            'type': 'labels',
                        },
                        {
                            'value': {'start': 44, 'end': 56, 'text': 'labeled data', 'labels': ['ACTION']},
                            'from_name': 'label',
                            'to_name': 'text',
                            'type': 'labels',
                        },
                    ]
                }
            ],
            'predictions': [
                {
                    'result': [
                        {
                            'value': {'start': 0, 'end': 22, 'text': 'Machine learning models', 'labels': ['FIELD']},
                            'from_name': 'label',
                            'to_name': 'text',
                            'type': 'labels',
                        }
                    ]
                }
            ],
        },
        {'data': {'text': 'Prosper annotation helps improve model accuracy.'}, 'predictions': [{'result': []}]},
    ]

    def setUp(self):
        self.project = ProjectFactory()
        self.storage = S3ImportStorage(
            project=self.project,
            bucket='example',
            aws_access_key_id='example',
            aws_secret_access_key='example',
            use_blob_urls=False,
        )
        self.storage.save()

    def _create_tasks(self, params_list: list[StorageObjectParams]):
        # check that no errors are raised during task creation; not checking the task itself
        for params in params_list:
            _ = S3ImportStorage.add_task(self.project, 1, 0, self.storage, params, S3ImportStorageLink)

    def test_bare_task(self):

        task_data = self.bare_task_list[0]

        blob_str = json.dumps(task_data).encode()
        output = load_tasks_json(blob_str, 'test.json')
        expected_output = [StorageObjectParams(key='test.json', task_data=task_data)]
        self.assertEqual(output, expected_output)

        self._create_tasks(output)

    def test_data_key(self):

        task_data = {'data': self.bare_task_list[0]}

        blob_str = json.dumps(task_data).encode()
        output = load_tasks_json(blob_str, 'test.json')
        expected_output = [StorageObjectParams(key='test.json', task_data=task_data)]
        self.assertEqual(output, expected_output)

        self._create_tasks(output)

    def test_1elem_list(self):

        task_data = self.bare_task_list[:1]

        blob_str = json.dumps(task_data).encode()
        output = load_tasks_json(blob_str, 'test.json')
        expected_output = [
            StorageObjectParams(key='test.json', task_data=task_data[0], row_index=0),
        ]
        self.assertEqual(output, expected_output)

        self._create_tasks(output)

    def test_2elem_list(self):

        task_data = self.bare_task_list

        blob_str = json.dumps(task_data).encode()
        output = load_tasks_json(blob_str, 'test.json')
        expected_output = [
            StorageObjectParams(key='test.json', task_data=task_data[0], row_index=0),
            StorageObjectParams(key='test.json', task_data=task_data[1], row_index=1),
        ]
        self.assertEqual(output, expected_output)

        self._create_tasks(output)

    def test_preds_and_annots_list(self):
        task_data = self.annots_preds_task_list

        blob_str = json.dumps(task_data).encode()
        output = load_tasks_json(blob_str, 'test.json')
        expected_output = [
            StorageObjectParams(key='test.json', task_data=task_data[0], row_index=0),
            StorageObjectParams(key='test.json', task_data=task_data[1], row_index=1),
        ]
        self.assertEqual(output, expected_output)

        self._create_tasks(output)

    @mock_feature_flag('fflag_feat_root_11_support_jsonl_cloud_storage', True)
    def test_list_jsonl(self):
        task_data = self.bare_task_list

        blob_str = '\n'.join([json.dumps(task) for task in task_data]).encode()
        output = load_tasks_json(blob_str, 'test.jsonl')
        expected_output = [
            StorageObjectParams(key='test.jsonl', task_data=task_data[0], row_index=0),
            StorageObjectParams(key='test.jsonl', task_data=task_data[1], row_index=1),
        ]
        self.assertEqual(output, expected_output)

        self._create_tasks(output)

    @mock_feature_flag('fflag_feat_root_11_support_jsonl_cloud_storage', True)
    def test_list_jsonl_with_preds_and_annots(self):
        task_data = self.annots_preds_task_list

        blob_str = '\n'.join([json.dumps(task) for task in task_data]).encode()
        output = load_tasks_json(blob_str, 'test.jsonl')
        expected_output = [
            StorageObjectParams(key='test.jsonl', task_data=task_data[0], row_index=0),
            StorageObjectParams(key='test.jsonl', task_data=task_data[1], row_index=1),
        ]
        self.assertEqual(output, expected_output)

        self._create_tasks(output)

    @mock_feature_flag('fflag_feat_root_11_support_jsonl_cloud_storage', False)
    def test_ff_blocks_jsonl(self):
        with self.assertRaises(ValueError):
            load_tasks_json(b'{"text": "Test task 1"}\n{"text": "Test task 2"}', 'test.jsonl')

    def test_mixed_formats_invalid(self):
        task_data = [self.bare_task_list[0], self.annots_preds_task_list[0]]

        with self.assertRaises(ValueError):
            blob_str = json.dumps(task_data).encode()
            load_tasks_json(blob_str, 'test.json')

        with self.assertRaises(ValueError):
            blob_str = '\n'.join([json.dumps(task) for task in task_data]).encode()
            load_tasks_json(blob_str, 'test.jsonl')
