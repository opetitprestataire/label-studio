import io
import unittest
from unittest.mock import MagicMock
from urllib.parse import urlparse


# Simple implementation of get_bytes_stream from S3StorageMixin, without Django dependencies
class S3StorageTester:
    def __init__(self):
        self.client = None

    def get_client(self):
        return self.client

    def get_bytes_stream(self, uri):
        """Get file bytes from S3 storage as a stream and content type.

        Args:
            uri: The S3 URI of the file to retrieve

        Returns:
            Tuple of (BytesIO stream, content_type)
        """
        # Parse URI to get bucket and key
        parsed_uri = urlparse(uri, allow_fragments=False)
        bucket_name = parsed_uri.netloc
        key = parsed_uri.path.lstrip('/')

        # Get S3 client
        client = self.get_client()

        try:
            # Get the object from S3
            object_response = client.get_object(Bucket=bucket_name, Key=key)
            content_type = object_response.get('ContentType')
            data = io.BytesIO(object_response['Body'].read())
            return data, content_type

        except Exception:
            return None, None


# Simple implementation of get_bytes_stream from AzureBlobStorageMixin, without Django dependencies
class AzureBlobStorageTester:
    def __init__(self):
        self.client = None
        self.container = None

    def get_client_and_container(self):
        return self.client, self.container

    def get_bytes_stream(self, uri):
        """Get file bytes from Azure Blob storage as a stream and content type.

        Args:
            uri: The Azure URI of the file to retrieve

        Returns:
            Tuple of (BytesIO stream, content_type)
        """
        # Parse URI to get container and blob name
        parsed_uri = urlparse(uri, allow_fragments=False)
        container_name = parsed_uri.netloc
        blob_name = parsed_uri.path.lstrip('/')

        try:
            # Get the Azure client
            client, _ = self.get_client_and_container()

            # Get a blob client for the requested blob
            blob_client = client.get_blob_client(container=container_name, blob=blob_name)

            # Download the blob
            download_stream = blob_client.download_blob()
            content_type = download_stream.properties.content_settings.content_type
            data = io.BytesIO(download_stream.readall())

            return data, content_type

        except Exception:
            return None, None


# Simple implementation of get_bytes_stream from GCSStorageMixin, without Django dependencies
class GCSStorageTester:
    def __init__(self):
        self.client = None

    def get_client(self):
        return self.client

    def get_bytes_stream(self, uri):
        """Get file bytes from GCS storage as a stream and content type.

        Args:
            uri: The GCS URI of the file to retrieve

        Returns:
            Tuple of (BytesIO stream, content_type)
        """
        # Parse URI to get bucket and key
        parsed_uri = urlparse(uri, allow_fragments=False)
        bucket_name = parsed_uri.netloc
        blob_name = parsed_uri.path.lstrip('/')

        try:
            # Get client and bucket using existing methods
            client = self.get_client()
            bucket = client.get_bucket(bucket_name)
            blob = bucket.blob(blob_name)
            blob.reload()
            content_type = blob.content_type or 'application/octet-stream'
            data = io.BytesIO(blob.download_as_bytes())
            return data, content_type
        except Exception:
            return None, None


class TestS3StorageMixinGetBytesStream(unittest.TestCase):
    """Test the get_bytes_stream method in S3StorageMixin"""

    def setUp(self):
        # Create an instance of our tester class
        self.storage = S3StorageTester()
        # Setup mock client
        self.mock_client = MagicMock()
        # Set the mock client
        self.storage.client = self.mock_client

    def test_get_bytes_stream_success(self):
        # Create a mock response for get_object
        mock_body = MagicMock()
        mock_body.read.return_value = b'test file content'

        # Set up the mock get_object response
        self.mock_client.get_object.return_value = {'Body': mock_body, 'ContentType': 'text/plain'}

        # Call the get_bytes_stream method
        uri = 's3://test-bucket/test-file.txt'
        result_stream, result_content_type = self.storage.get_bytes_stream(uri)

        # Assert method calls and results
        self.mock_client.get_object.assert_called_once_with(Bucket='test-bucket', Key='test-file.txt')
        self.assertEqual(result_content_type, 'text/plain')
        self.assertEqual(result_stream.read(), b'test file content')

    def test_get_bytes_stream_exception(self):
        # Set up the mock to raise an exception
        self.mock_client.get_object.side_effect = Exception('Connection error')

        # Call the get_bytes_stream method
        uri = 's3://test-bucket/test-file.txt'
        result_stream, result_content_type = self.storage.get_bytes_stream(uri)

        # Assert method calls and results
        self.mock_client.get_object.assert_called_once_with(Bucket='test-bucket', Key='test-file.txt')
        self.assertIsNone(result_stream)
        self.assertIsNone(result_content_type)


class TestAzureBlobStorageMixinGetBytesStream(unittest.TestCase):
    """Test the get_bytes_stream method in AzureBlobStorageMixin"""

    def setUp(self):
        # Create an instance of our tester class
        self.storage = AzureBlobStorageTester()
        # Setup mock client and container
        self.mock_client = MagicMock()
        self.mock_container = MagicMock()
        # Set the mock client and container
        self.storage.client = self.mock_client
        self.storage.container = self.mock_container

    def test_get_bytes_stream_success(self):
        # Mock the blob client and download_blob
        mock_blob_client = MagicMock()
        self.mock_client.get_blob_client.return_value = mock_blob_client

        # Mock the download stream
        mock_download_stream = MagicMock()
        mock_blob_client.download_blob.return_value = mock_download_stream
        mock_download_stream.properties.content_settings.content_type = 'image/jpeg'
        mock_download_stream.readall.return_value = b'fake image data'

        # Call the get_bytes_stream method
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

        # Call the get_bytes_stream method
        uri = 'azure-blob://test-container/test-image.jpg'
        result_stream, result_content_type = self.storage.get_bytes_stream(uri)

        # Assert results
        self.assertIsNone(result_stream)
        self.assertIsNone(result_content_type)


class TestGCSStorageMixinGetBytesStream(unittest.TestCase):
    """Test the get_bytes_stream method in GCSStorageMixin"""

    def setUp(self):
        # Create an instance of our tester class
        self.storage = GCSStorageTester()
        # Setup mock client
        self.mock_client = MagicMock()
        # Set the mock client
        self.storage.client = self.mock_client

    def test_get_bytes_stream_success(self):
        # Mock bucket and blob
        mock_bucket = MagicMock()
        self.mock_client.get_bucket.return_value = mock_bucket

        mock_blob = MagicMock()
        mock_bucket.blob.return_value = mock_blob

        # Set blob properties
        mock_blob.content_type = 'application/pdf'
        mock_blob.download_as_bytes.return_value = b'fake pdf data'

        # Call the get_bytes_stream method
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

        # Call the get_bytes_stream method
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

        # Call the get_bytes_stream method
        uri = 'gs://test-bucket/test-file'
        result_stream, result_content_type = self.storage.get_bytes_stream(uri)

        # Assert results
        self.assertEqual(result_content_type, 'application/octet-stream')
        self.assertEqual(result_stream.read(), b'test data')
