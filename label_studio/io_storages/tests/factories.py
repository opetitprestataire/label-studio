import factory
from projects.models import Project, ProjectMember
from io_storages.base_models import ImportStorage, ProjectStorageMixin
from io_storages.models import AzureBlobImportStorage, S3ImportStorage, GCSImportStorage, RedisImportStorage


class ImportStorageFactory(factory.django.DjangoModelFactory):
    title = factory.Faker('bs')
    description = factory.Faker('paragraph')

    class Meta:
        model = ImportStorage
        abstract = True


class ProjectStorageMixinFactory(factory.django.DjangoModelFactory):
    project = factory.SubFactory('projects.tests.factories.ProjectFactory')

    class Meta:
        model = ProjectStorageMixin
        abstract = True


class AzureBlobImportStorageFactory(ImportStorageFactory, ProjectStorageMixinFactory):
    # these must be set to non-empty values for the mock to pass validation
    account_name = factory.Faker('word')
    account_key = factory.Faker('word')

    class Meta:
        model = AzureBlobImportStorage


class S3ImportStorageFactory(ImportStorageFactory, ProjectStorageMixinFactory):
    class Meta:
        model = S3ImportStorage


class GCSImportStorageFactory(ImportStorageFactory, ProjectStorageMixinFactory):
    class Meta:
        model = GCSImportStorage


class RedisImportStorageFactory(ImportStorageFactory, ProjectStorageMixinFactory):
    class Meta:
        model = RedisImportStorage
