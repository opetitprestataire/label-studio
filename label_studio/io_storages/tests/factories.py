import factory
from core.utils.common import load_func
from django.conf import settings
from io_storages.base_models import ImportStorage, ProjectStorageMixin
from io_storages.models import (
    AzureBlobExportStorage,
    AzureBlobImportStorage,
    GCSImportStorage,
    RedisImportStorage,
    S3ImportStorage,
)
from tests.base_factories import BaseModelFactory


class StorageFactory(BaseModelFactory):
    title = factory.Faker('bs')
    description = factory.Faker('paragraph')

    class Meta:
        model = ImportStorage
        abstract = True


class ImportStorageFactory(StorageFactory):
    class Meta:
        model = ImportStorage
        abstract = True


class ProjectStorageMixinFactory(BaseModelFactory):
    project = factory.SubFactory(load_func(settings.PROJECT_FACTORY))

    class Meta:
        model = ProjectStorageMixin
        abstract = True


class AzureBlobStorageMixinFactory(BaseModelFactory):
    account_name = factory.Faker('word')
    account_key = factory.Faker('word')

    class Meta:
        abstract = True


class AzureBlobImportStorageBaseFactory(AzureBlobStorageMixinFactory, ImportStorageFactory):
    class Meta:
        model = AzureBlobImportStorage
        abstract = True


class AzureBlobImportStorageFactory(AzureBlobImportStorageBaseFactory, ProjectStorageMixinFactory):
    class Meta:
        model = AzureBlobImportStorage


class S3StorageMixinFactory(BaseModelFactory):
    class Meta:
        abstract = True


class S3ImportStorageBaseFactory(S3StorageMixinFactory, ImportStorageFactory):
    class Meta:
        model = S3ImportStorage
        abstract = True


class S3ImportStorageFactory(S3ImportStorageBaseFactory, ProjectStorageMixinFactory):
    class Meta:
        model = S3ImportStorage


class GCSStorageMixinFactory(BaseModelFactory):
    class Meta:
        abstract = True


class GCSImportStorageBaseFactory(GCSStorageMixinFactory, ImportStorageFactory):
    class Meta:
        model = GCSImportStorage
        abstract = True


class GCSImportStorageFactory(GCSImportStorageBaseFactory, ProjectStorageMixinFactory):
    class Meta:
        model = GCSImportStorage


class RedisStorageMixinFactory(BaseModelFactory):
    class Meta:
        abstract = True


class RedisImportStorageBaseFactory(RedisStorageMixinFactory, ImportStorageFactory):
    class Meta:
        model = RedisImportStorage
        abstract = True


class RedisImportStorageFactory(RedisImportStorageBaseFactory, ProjectStorageMixinFactory):
    class Meta:
        model = RedisImportStorage


class AzureBlobExportStorageFactory(BaseModelFactory):
    class Meta:
        model = AzureBlobExportStorage
