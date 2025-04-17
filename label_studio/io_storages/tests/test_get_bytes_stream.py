import unittest
from unittest.mock import MagicMock, patch

# Add Django models import
from django.db import models
from io_storages.azure_blob.models import AzureBlobStorageMixin
from io_storages.gcs.models import GCSStorageMixin
from io_storages.s3.models import S3StorageMixin


# Define concrete classes inheriting from the mixins
# Abstract models cannot be instantiated directly, so we create
# simple concrete models for testing purposes.
class ConcreteS3Storage(S3StorageMixin, models.Model):
    class Meta:
        app_label = 'tests'


class ConcreteAzureBlobStorage(AzureBlobStorageMixin, models.Model):
    class Meta:
        app_label = 'tests'


class ConcreteGCSStorage(GCSStorageMixin, models.Model):
    class Meta:
        app_label = 'tests'


class TestS3StorageMixinGetBytesStream(unittest.TestCase):
    """Test the get_bytes_stream method in S3StorageMixin"""

    def setUp(self):
        # Create an instance of the concrete class
        self.storage = ConcreteS3Storage()
        # Setup mock client
        self.mock_client = MagicMock()
        # Patch the get_client method to return our mock client
        self.get_client_patcher = patch.object(self.storage, 'get_client', return_value=self.mock_client)
        self.get_client_patcher.start()
        self.addCleanup(self.get_client_patcher.stop)

    def test_get_bytes_stream_success(self):
        # Create a mock response for get_object
        mock_body = MagicMock()
        mock_body.read.return_value = b'test file content'

        # Set up the mock get_object response
        self.mock_client.get_object.return_value = {
            'Body': mock_body,
            'ContentType': 'text/plain',
            'ResponseMetadata': {'HTTPStatusCode': 200},
        }

        # Call the real get_bytes_stream method
        uri = 's3://test-bucket/test-file.txt'
        result_stream, result_content_type, metadata = self.storage.get_bytes_stream(uri)

        # Assert method calls and results
        self.mock_client.get_object.assert_called_once_with(Bucket='test-bucket', Key='test-file.txt')
        self.assertEqual(result_content_type, 'text/plain')
        self.assertEqual(result_stream.read(), b'test file content')
        self.assertIsInstance(metadata, dict)

    def test_get_bytes_stream_exception(self):
        # Set up the mock to raise an exception
        self.mock_client.get_object.side_effect = Exception('Connection error')

        # Call the real get_bytes_stream method
        uri = 's3://test-bucket/test-file.txt'
        result_stream, result_content_type, metadata = self.storage.get_bytes_stream(uri)

        # Assert method calls and results
        self.mock_client.get_object.assert_called_once_with(Bucket='test-bucket', Key='test-file.txt')
        self.assertIsNone(result_stream)
        self.assertIsNone(result_content_type)
        self.assertEqual(metadata, {})


class TestAzureBlobStorageMixinGetBytesStream(unittest.TestCase):
    """Test the get_bytes_stream method in AzureBlobStorageMixin"""

    def setUp(self):
        # Create an instance of the concrete class
        self.storage = ConcreteAzureBlobStorage()
        # Setup mock client and container
        self.mock_client = MagicMock()
        self.mock_container = MagicMock()
        # Patch the get_client_and_container method
        self.get_client_patcher = patch.object(
            self.storage, 'get_client_and_container', return_value=(self.mock_client, self.mock_container)
        )
        self.get_client_patcher.start()
        self.addCleanup(self.get_client_patcher.stop)

    def test_get_bytes_stream_success(self):
        # Mock the blob client and download_blob
        mock_blob_client = MagicMock()
        self.mock_client.get_blob_client.return_value = mock_blob_client

        # Mock the download stream
        mock_download_stream = MagicMock()
        mock_blob_client.download_blob.return_value = mock_download_stream
        mock_download_stream.properties.content_settings.content_type = 'image/jpeg'
        mock_download_stream.readall.return_value = b'fake image data'

        # Call the real get_bytes_stream method
        uri = 'azure-blob://test-container/test-image.jpg'
        result_stream, result_content_type = self.storage.get_bytes_stream(uri)

        # Assert method calls and results
        self.mock_client.get_blob_client.assert_called_once_with(container='test-container', blob='test-image.jpg')
        mock_blob_client.download_blob.assert_called_once()
        self.assertEqual(result_content_type, 'image/jpeg')
        self.assertEqual(result_stream.read(), b'fake image data')

    def test_get_bytes_stream_exception(self):
        # Set up mock client to raise an exception
        self.mock_client.get_blob_client.side_effect = Exception('Azure connection error')

        # Call the real get_bytes_stream method
        uri = 'azure-blob://test-container/test-image.jpg'
        result_stream, result_content_type = self.storage.get_bytes_stream(uri)

        # Assert results
        self.assertIsNone(result_stream)
        self.assertIsNone(result_content_type)


class TestGCSStorageMixinGetBytesStream(unittest.TestCase):
    """Test the get_bytes_stream method in GCSStorageMixin"""

    def setUp(self):
        # Create an instance of the concrete class
        self.storage = ConcreteGCSStorage()
        # Setup mock client
        self.mock_client = MagicMock()
        # Patch the get_client method
        self.get_client_patcher = patch.object(self.storage, 'get_client', return_value=self.mock_client)
        self.get_client_patcher.start()
        self.addCleanup(self.get_client_patcher.stop)

    def test_get_bytes_stream_success(self):
        # Mock bucket and blob
        mock_bucket = MagicMock()
        self.mock_client.get_bucket.return_value = mock_bucket

        mock_blob = MagicMock()
        mock_bucket.blob.return_value = mock_blob

        # Set blob properties
        mock_blob.content_type = 'application/pdf'
        mock_blob.download_as_bytes.return_value = b'fake pdf data'

        # Call the real get_bytes_stream method
        uri = 'gs://test-bucket/test-document.pdf'
        result_stream, result_content_type = self.storage.get_bytes_stream(uri)

        # Assert method calls and results
        self.mock_client.get_bucket.assert_called_once_with('test-bucket')
        mock_bucket.blob.assert_called_once_with('test-document.pdf')
        mock_blob.reload.assert_called_once()
        self.assertEqual(result_content_type, 'application/pdf')
        self.assertEqual(result_stream.read(), b'fake pdf data')

    def test_get_bytes_stream_exception(self):
        # Set up mock client to raise an exception
        self.mock_client.get_bucket.side_effect = Exception('GCS connection error')

        # Call the real get_bytes_stream method
        uri = 'gs://test-bucket/test-document.pdf'
        result_stream, result_content_type = self.storage.get_bytes_stream(uri)

        # Assert results
        self.assertIsNone(result_stream)
        self.assertIsNone(result_content_type)

    def test_get_bytes_stream_with_default_content_type(self):
        # Mock bucket and blob
        mock_bucket = MagicMock()
        self.mock_client.get_bucket.return_value = mock_bucket

        mock_blob = MagicMock()
        mock_bucket.blob.return_value = mock_blob

        # Set blob properties with None content_type
        mock_blob.content_type = None
        mock_blob.download_as_bytes.return_value = b'test data'

        # Call the real get_bytes_stream method
        uri = 'gs://test-bucket/test-file'
        result_stream, result_content_type = self.storage.get_bytes_stream(uri)

        # Assert results
        self.assertEqual(result_content_type, 'application/octet-stream')
        self.assertEqual(result_stream.read(), b'test data')
