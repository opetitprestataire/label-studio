"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import hashlib
import logging
import os
import shutil
from copy import deepcopy
from datetime import datetime

import ujson as json
from core import version
from core.feature_flags import flag_set
from core.utils.common import load_func
from core.utils.io import get_all_files_from_dir, get_temp_dir, path_to_open_binary_file
from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from label_studio_sdk.converter import Converter
from tasks.models import Annotation

logger = logging.getLogger(__name__)


ExportMixin = load_func(settings.EXPORT_MIXIN)


class Export(ExportMixin, models.Model):
    class Status(models.TextChoices):
        CREATED = 'created', _('Created')
        IN_PROGRESS = 'in_progress', _('In progress')
        FAILED = 'failed', _('Failed')
        COMPLETED = 'completed', _('Completed')

    title = models.CharField(
        _('title'),
        blank=True,
        default='',
        max_length=2048,
    )
    created_at = models.DateTimeField(
        _('created at'),
        auto_now_add=True,
        help_text='Creation time',
    )
    file = models.FileField(
        upload_to=settings.DELAYED_EXPORT_DIR,
        null=True,
    )
    md5 = models.CharField(
        _('md5 of file'),
        max_length=128,
        default='',
    )
    finished_at = models.DateTimeField(
        _('finished at'),
        help_text='Complete or fail time',
        null=True,
        default=None,
    )

    status = models.CharField(
        _('Export status'),
        max_length=64,
        choices=Status.choices,
        default=Status.CREATED,
    )
    counters = models.JSONField(
        _('Exporting meta data'),
        default=dict,
    )
    project = models.ForeignKey(
        'projects.Project',
        related_name='exports',
        on_delete=models.CASCADE,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='+',
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('created by'),
    )


@receiver(post_save, sender=Export)
def set_export_default_name(sender, instance, created, **kwargs):
    if created and not instance.title:
        instance.title = instance.get_default_title()
        instance.save()


class DataExport(object):
    # TODO: deprecated
    @staticmethod
    def save_export_files(project, now, get_args, data, md5, name):
        """Generate two files: meta info and result file and store them locally for logging"""
        filename_results = os.path.join(settings.EXPORT_DIR, name + '.json')
        filename_info = os.path.join(settings.EXPORT_DIR, name + '-info.json')
        annotation_number = Annotation.objects.filter(project=project).count()
        try:
            platform_version = version.get_git_version()
        except:  # noqa: E722
            platform_version = 'none'
            logger.error('Version is not detected in save_export_files()')
        info = {
            'project': {
                'title': project.title,
                'id': project.id,
                'created_at': project.created_at.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'created_by': project.created_by.email,
                'task_number': project.tasks.count(),
                'annotation_number': annotation_number,
            },
            'platform': {'version': platform_version},
            'download': {
                'GET': dict(get_args),
                'time': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'result_filename': filename_results,
                'md5': md5,
            },
        }

        with open(filename_results, 'w', encoding='utf-8') as f:
            f.write(data)
        with open(filename_info, 'w', encoding='utf-8') as f:
            json.dump(info, f, ensure_ascii=False)
        return filename_results

    @staticmethod
    def get_export_formats(project):
        logger.info(f"[get_export_formats] Getting export formats for project {project.id}")
        converter = Converter(config=project.get_parsed_config(), project_dir=None)
        formats = []
        supported_formats = set(converter.supported_formats)
        logger.info(f"[get_export_formats] Supported formats: {supported_formats}")
        
        for format, format_info in converter.all_formats().items():
            format_info = deepcopy(format_info)
            format_info['name'] = format.name
            if format.name not in supported_formats:
                format_info['disabled'] = True
                logger.info(f"[get_export_formats] Format {format.name} is disabled (not supported)")
            formats.append(format_info)
        
        # Add custom GCS export format
        gcs_format = {
            'name': 'YOLO_WITH_IMAGES_TO_GCS',
            'title': 'YOLO with Images To GCS',
            'description': 'Export YOLO format with images directly to Google Cloud Storage using project target storage configuration.',
            'link': 'https://labelstud.io/guide/export.html#YOLO',
            'tags': ['image segmentation', 'object detection', 'keypoints', 'cloud storage'],
            'disabled': False
        }
        formats.append(gcs_format)
        logger.info(f"[get_export_formats] Added custom GCS format: {gcs_format['name']}")
        
        result = sorted(formats, key=lambda f: f.get('disabled', False))
        logger.info(f"[get_export_formats] Total formats returned: {len(result)}")
        return result

    @staticmethod
    def generate_export_file(project, tasks, output_format, download_resources, get_args, hostname=None):
        """Generate export file and return it as an open file object.

        Be sure to close the file after using it, to avoid wasting disk space.
        """
        logger.info(f"[generate_export_file] Starting export for project {project.id}, format: {output_format}, download_resources: {download_resources}")

        # prepare for saving
        now = datetime.now()
        data = json.dumps(tasks, ensure_ascii=False)
        md5 = hashlib.md5(json.dumps(data).encode('utf-8')).hexdigest()   # nosec
        name = 'project-' + str(project.id) + '-at-' + now.strftime('%Y-%m-%d-%H-%M') + f'-{md5[0:8]}'

        input_json = DataExport.save_export_files(project, now, get_args, data, md5, name)
        logger.info(f"[generate_export_file] Input JSON saved to: {input_json}")

        converter = Converter(
            config=project.get_parsed_config(),
            project_dir=None,
            upload_dir=os.path.join(settings.MEDIA_ROOT, settings.UPLOAD_DIR),
            download_resources=download_resources,
            access_token=project.organization.created_by.auth_token.key,
            hostname=hostname,
        )
        logger.info(f"[generate_export_file] Converter created with download_resources={download_resources}")
        
        with get_temp_dir() as tmp_dir:
            logger.info(f"[generate_export_file] Using temp directory: {tmp_dir}")
            converter.convert(input_json, tmp_dir, output_format, is_dir=False)
            files = get_all_files_from_dir(tmp_dir)
            logger.info(f"[generate_export_file] Generated files: {files}")
            logger.info(f"[generate_export_file] Directory contents: {os.listdir(tmp_dir)}")
            
            # if only one file is exported - no need to create archive
            if len(os.listdir(tmp_dir)) == 1:
                output_file = files[0]
                ext = os.path.splitext(output_file)[-1]
                content_type = f'application/{ext}'
                out = path_to_open_binary_file(output_file)
                filename = name + os.path.splitext(output_file)[-1]
                logger.info(f"[generate_export_file] Single file export: {filename}, size: {os.path.getsize(output_file)} bytes")
                return out, content_type, filename

            # otherwise pack output directory into archive
            shutil.make_archive(tmp_dir, 'zip', tmp_dir)
            out = path_to_open_binary_file(os.path.abspath(tmp_dir + '.zip'))
            content_type = 'application/zip'
            filename = name + '.zip'
            logger.info(f"[generate_export_file] Archive export: {filename}, size: {os.path.getsize(tmp_dir + '.zip')} bytes")
            return out, content_type, filename

    @staticmethod
    def generate_export_to_gcs(project, tasks, output_format, download_resources, get_args, hostname=None):
        """Generate export file and upload to GCS using project's target storage.
        
        Returns a dictionary with upload results.
        """
        logger.info(f"[generate_export_to_gcs] Starting GCS export for project {project.id}, original format: {output_format}, download_resources: {download_resources}")
        
        from io_storages.models import get_storage_classes
        
        # Get project's export storage configurations
        export_storages = []
        for storage_class in get_storage_classes('export'):
            export_storages += list(storage_class.objects.filter(project=project))
        
        logger.info(f"[generate_export_to_gcs] Found {len(export_storages)} export storages")
        
        if not export_storages:
            raise ValueError("No export storage configured for this project")
        
        # For now, use the first GCS export storage
        gcs_storage = None
        for storage in export_storages:
            # Check if this is a GCS storage by looking for GCS-specific attributes
            if (hasattr(storage, 'bucket') and 
                hasattr(storage, 'get_client') and 
                hasattr(storage, 'google_application_credentials')):
                gcs_storage = storage
                break
        
        if not gcs_storage:
            raise ValueError("No GCS export storage configured for this project")
        
        logger.info(f"[generate_export_to_gcs] Using GCS storage: {gcs_storage.title}, bucket: {gcs_storage.bucket}")
        
        # Generate export files
        now = datetime.now()
        data = json.dumps(tasks, ensure_ascii=False)
        md5 = hashlib.md5(json.dumps(data).encode('utf-8')).hexdigest()
        name = 'project-' + str(project.id) + '-at-' + now.strftime('%Y-%m-%d-%H-%M') + f'-{md5[0:8]}'
        
        input_json = DataExport.save_export_files(project, now, get_args, data, md5, name)
        logger.info(f"[generate_export_to_gcs] Input JSON saved to: {input_json}")
        
        upload_results = []
        
        with get_temp_dir() as tmp_dir:
            # Create a subdirectory for the converter to work with
            converter_dir = os.path.join(tmp_dir, 'converter_output')
            os.makedirs(converter_dir, exist_ok=True)
            logger.info(f"[generate_export_to_gcs] Using temp directory: {tmp_dir}, converter dir: {converter_dir}")
            
            converter = Converter(
                config=project.get_parsed_config(),
                project_dir=None,
                upload_dir=os.path.join(settings.MEDIA_ROOT, settings.UPLOAD_DIR),
                download_resources=True,  # Force download resources for YOLO_WITH_IMAGES
                access_token=project.organization.created_by.auth_token.key,
                hostname=hostname,
            )
            logger.info(f"[generate_export_to_gcs] Converter created with download_resources=True (forced)")
            
            # Use YOLO_WITH_IMAGES format for conversion, not the output_format parameter
            logger.info(f"[generate_export_to_gcs] Converting to YOLO_WITH_IMAGES format (ignoring original format: {output_format})")
            converter.convert(input_json, converter_dir, 'YOLO_WITH_IMAGES', is_dir=False)
            # Get all files recursively from the converter directory
            all_files = []
            for root, dirs, files in os.walk(converter_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    all_files.append(file_path)
            
            logger.info(f"[generate_export_to_gcs] Generated files: {all_files}")
            logger.info(f"[generate_export_to_gcs] Converter directory contents: {os.listdir(converter_dir)}")
            
            # Upload each file to GCS
            logger.info(f"[generate_export_to_gcs] Starting upload of {len(all_files)} files to GCS")
            for file_path in all_files:
                # Calculate relative path from converter_dir and normalize for GCS
                rel_path = os.path.relpath(file_path, converter_dir)
                # Convert Windows path separators to GCS path separators
                rel_path = rel_path.replace('\\', '/')
                gcs_key = f"{gcs_storage.prefix}/{name}/{rel_path}" if gcs_storage.prefix else f"{name}/{rel_path}"
                file_size = os.path.getsize(file_path)
                logger.info(f"[generate_export_to_gcs] Uploading file: {rel_path} ({file_size} bytes) to {gcs_key}")
                
                try:
                    # Upload file to GCS
                    bucket = gcs_storage.get_bucket()
                    blob = bucket.blob(gcs_key)
                    
                    with open(file_path, 'rb') as f:
                        blob.upload_from_file(f)
                    
                    logger.info(f"[generate_export_to_gcs] Successfully uploaded {rel_path} to gs://{gcs_storage.bucket}/{gcs_key}")
                    upload_results.append({
                        'file_name': rel_path,
                        'gcs_path': f"gs://{gcs_storage.bucket}/{gcs_key}",
                        'status': 'success',
                        'size': file_size
                    })
                    
                except Exception as e:
                    logger.error(f"[generate_export_to_gcs] Failed to upload {rel_path}: {str(e)}")
                    upload_results.append({
                        'file_name': rel_path,
                        'gcs_path': f"gs://{gcs_storage.bucket}/{gcs_key}",
                        'status': 'error',
                        'error': str(e)
                    })
        
        # Calculate summary statistics
        successful_uploads = len([r for r in upload_results if r['status'] == 'success'])
        failed_uploads = len([r for r in upload_results if r['status'] == 'error'])
        
        logger.info(f"[generate_export_to_gcs] Upload completed: {successful_uploads} successful, {failed_uploads} failed")
        
        result = {
            'storage_name': gcs_storage.title,
            'bucket': gcs_storage.bucket,
            'prefix': gcs_storage.prefix,
            'upload_results': upload_results,
            'total_files': len(upload_results),
            'successful_uploads': successful_uploads,
            'failed_uploads': failed_uploads
        }
        
        logger.info(f"[generate_export_to_gcs] Final result: {result}")
        return result


class ConvertedFormat(models.Model):
    class Status(models.TextChoices):
        CREATED = 'created', _('Created')
        IN_PROGRESS = 'in_progress', _('In progress')
        FAILED = 'failed', _('Failed')
        COMPLETED = 'completed', _('Completed')

    project = models.ForeignKey(
        'projects.Project',
        null=True,
        related_name='export_conversions',
        on_delete=models.CASCADE,
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        null=True,
        on_delete=models.CASCADE,
        related_name='export_conversions',
    )
    export = models.ForeignKey(
        Export,
        related_name='converted_formats',
        on_delete=models.CASCADE,
        help_text='Export snapshot for this converted file',
    )
    file = models.FileField(
        upload_to=settings.DELAYED_EXPORT_DIR,
        null=True,
    )
    status = models.CharField(
        max_length=64,
        choices=Status.choices,
        default=Status.CREATED,
    )
    traceback = models.TextField(null=True, blank=True, help_text='Traceback report in case of errors')
    export_type = models.CharField(max_length=64)
    created_at = models.DateTimeField(
        _('created at'),
        null=True,
        auto_now_add=True,
        help_text='Creation time',
    )
    updated_at = models.DateTimeField(
        _('updated at'),
        null=True,
        auto_now_add=True,
        help_text='Updated time',
    )
    finished_at = models.DateTimeField(
        _('finished at'),
        help_text='Complete or fail time',
        null=True,
        default=None,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='+',
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('created by'),
    )

    def delete(self, *args, **kwargs):
        if flag_set('ff_back_dev_4664_remove_storage_file_on_export_delete_29032023_short'):
            if self.file:
                self.file.delete()
        super().delete(*args, **kwargs)
