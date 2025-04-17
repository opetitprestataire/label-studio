"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import base64
import fnmatch
import io
import logging
import re
from urllib.parse import urlparse

import boto3
from botocore.exceptions import ClientError
from core.utils.params import get_env
from django.conf import settings
from tldextract import TLDExtract

logger = logging.getLogger(__name__)


def get_client_and_resource(
    aws_access_key_id=None, aws_secret_access_key=None, aws_session_token=None, region_name=None, s3_endpoint=None
):
    aws_access_key_id = aws_access_key_id or get_env('AWS_ACCESS_KEY_ID')
    aws_secret_access_key = aws_secret_access_key or get_env('AWS_SECRET_ACCESS_KEY')
    aws_session_token = aws_session_token or get_env('AWS_SESSION_TOKEN')
    logger.debug(
        f'Create boto3 session with '
        f'access key id={aws_access_key_id}, '
        f'secret key={aws_secret_access_key[:4] + "..." if aws_secret_access_key else None}, '
        f'session token={aws_session_token}'
    )
    session = boto3.Session(
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        aws_session_token=aws_session_token,
    )
    settings = {'region_name': region_name or get_env('S3_region') or 'us-east-1'}
    s3_endpoint = s3_endpoint or get_env('S3_ENDPOINT')
    if s3_endpoint:
        settings['endpoint_url'] = s3_endpoint
    client = session.client('s3', config=boto3.session.Config(signature_version='s3v4'), **settings)
    resource = session.resource('s3', config=boto3.session.Config(signature_version='s3v4'), **settings)
    return client, resource


def resolve_s3_url(url, client, presign=True, expires_in=3600):
    r = urlparse(url, allow_fragments=False)
    bucket_name = r.netloc
    key = r.path.lstrip('/')

    # Return blob as base64 encoded string if presigned urls are disabled
    if not presign:
        object = client.get_object(Bucket=bucket_name, Key=key)
        content_type = object['ResponseMetadata']['HTTPHeaders']['content-type']
        object_b64 = 'data:' + content_type + ';base64,' + base64.b64encode(object['Body'].read()).decode('utf-8')
        return object_b64

    # Otherwise try to generate presigned url
    try:
        presigned_url = client.generate_presigned_url(
            ClientMethod='get_object', Params={'Bucket': bucket_name, 'Key': key}, ExpiresIn=expires_in
        )
    except ClientError as exc:
        logger.warning(f"Can't generate presigned URL. Reason: {exc}")
        return url
    else:
        logger.debug('Presigned URL {presigned_url} generated for {url}'.format(presigned_url=presigned_url, url=url))
        return presigned_url


class AWS(object):
    @classmethod
    def get_blob_metadata(
        cls,
        url: str,
        bucket_name: str,
        client=None,
        aws_access_key_id=None,
        aws_secret_access_key=None,
        aws_session_token=None,
        region_name=None,
        s3_endpoint=None,
    ):
        """
        Get blob metadata by url
        :param url: Object key
        :param bucket_name: AWS bucket name
        :param client: AWS client for batch processing
        :param account_key: Azure account key
        :return: Object metadata dict("name": "value")
        """
        if client is None:
            client, _ = get_client_and_resource(
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key,
                aws_session_token=aws_session_token,
                region_name=region_name,
                s3_endpoint=s3_endpoint,
            )
        object = client.get_object(Bucket=bucket_name, Key=url)
        metadata = dict(object)
        # remove unused fields
        metadata.pop('Body', None)
        metadata.pop('ResponseMetadata', None)
        return metadata

    @classmethod
    def validate_pattern(cls, storage, pattern, glob_pattern=True):
        """
        Validate pattern against S3 Storage
        :param storage: S3 Storage instance
        :param pattern: Pattern to validate
        :param glob_pattern: If True, pattern is a glob pattern, otherwise it is a regex pattern
        :return: Message if pattern is not valid, empty string otherwise
        """
        client, bucket = storage.get_client_and_bucket()
        if glob_pattern:
            pattern = fnmatch.translate(pattern)
        regex = re.compile(pattern)

        if storage.prefix:
            list_kwargs = {'Prefix': storage.prefix.rstrip('/') + '/'}
            if not storage.recursive_scan:
                list_kwargs['Delimiter'] = '/'
            bucket_iter = bucket.objects.filter(**list_kwargs)
        else:
            bucket_iter = bucket.objects

        bucket_iter = bucket_iter.page_size(settings.CLOUD_STORAGE_CHECK_FOR_RECORDS_PAGE_SIZE).all()

        for index, obj in enumerate(bucket_iter):
            key = obj.key
            # skip directories
            if key.endswith('/'):
                logger.debug(key + ' is skipped because it is a folder')
                continue
            if regex and regex.match(key):
                logger.debug(key + ' matches file pattern')
                return ''
        return 'No objects found matching the provided glob pattern'


class S3StorageError(Exception):
    pass


# see https://github.com/john-kurkowski/tldextract?tab=readme-ov-file#note-about-caching
# prevents network call on first use
extractor = TLDExtract(suffix_list_urls=())


def catch_and_reraise_from_none(func):
    """
    For S3 storages - if s3_endpoint is not on a known domain, catch exception and
    raise a new one with the previous context suppressed. See also: https://peps.python.org/pep-0409/
    """

    def wrapper(self, *args, **kwargs):
        try:
            return func(self, *args, **kwargs)
        except Exception as e:
            if self.s3_endpoint and (
                domain := extractor.extract_urllib(urlparse(self.s3_endpoint)).registered_domain.lower()
            ) not in [trusted_domain.lower() for trusted_domain in settings.S3_TRUSTED_STORAGE_DOMAINS]:
                logger.error(f'Exception from unrecognized S3 domain: {e}', exc_info=True)
                raise S3StorageError(
                    f'Debugging info is not available for s3 endpoints on domain: {domain}. '
                    'Please contact your Label Studio devops team if you require detailed error reporting for this domain.'
                ) from None
            else:
                raise e

    return wrapper


class S3StreamWrapper(io.BufferedIOBase):
    """A seekable wrapper for S3 streaming body.

    This implementation supports range requests by creating new S3 requests
    for backward seeks, making it compatible with RangedFileResponse.
    """

    def __init__(self, client, bucket, key, initial_stream, content_length, chunk_size=8192):
        self.client = client
        self.bucket = bucket
        self.key = key
        self.streaming_body = initial_stream
        self.content_length = content_length
        self.chunk_size = chunk_size
        self._pos = 0
        self._eof = False

    def readable(self):
        return True

    def seekable(self):
        return True

    def writable(self):
        return False

    def seek(self, offset, whence=io.SEEK_SET):
        if whence == io.SEEK_SET:
            if offset < 0:
                raise ValueError('Cannot seek to negative position')

            LARGE_SKIP = 256 * 1024    # 256 kB

            if offset < self._pos or (offset - self._pos) > LARGE_SKIP:
                self._restart_at(offset)
            else:
                self._read_until_position(offset)

            return self._pos
        elif whence == io.SEEK_CUR:
            return self.seek(self._pos + offset, io.SEEK_SET)
        elif whence == io.SEEK_END:
            if self.content_length is None:
                raise io.UnsupportedOperation('Cannot seek from end without content length')
            return self.seek(self.content_length + offset, io.SEEK_SET)
        else:
            raise ValueError(f'Invalid whence value: {whence}')

    def _read_until_position(self, position):
        """Read and discard data until reaching the specified position."""
        bytes_to_skip = position - self._pos
        while bytes_to_skip > 0 and not self._eof:
            skip_size = min(bytes_to_skip, self.chunk_size)
            data = self.streaming_body.read(skip_size)
            if not data:
                self._eof = True
                break
            bytes_to_skip -= len(data)
            self._pos += len(data)
        return self._pos

    def tell(self):
        return self._pos

    def read(self, size=-1):
        if size < 0:
            # Read to the end of file
            chunks = []
            while not self._eof:
                chunk = self.streaming_body.read(self.chunk_size)
                if not chunk:
                    self._eof = True
                    break
                chunks.append(chunk)
                self._pos += len(chunk)
            return b''.join(chunks)

        # Read exactly size bytes
        result = bytearray()
        bytes_remaining = size

        while bytes_remaining > 0 and not self._eof:
            chunk = self.streaming_body.read(min(bytes_remaining, self.chunk_size))
            if not chunk:
                self._eof = True
                break
            result.extend(chunk)
            bytes_remaining -= len(chunk)
            self._pos += len(chunk)

        return bytes(result)

    def read1(self, size=-1):
        """Read up to size bytes, respecting buffer boundaries."""
        if size < 0:
            size = self.chunk_size
        return self.read(size)

    def close(self):
        try:
            self.streaming_body.close()
        finally:
            super().close()

    def _restart_at(self, offset: int):
        resp = self.client.get_object(
            Bucket=self.bucket, Key=self.key, Range=f"bytes={offset}-"
        )
        self.streaming_body = resp["Body"]
        self._pos = offset
        self._eof = False
