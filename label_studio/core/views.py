"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import io
import json
import logging
import mimetypes
import os
import posixpath
from pathlib import Path
from wsgiref.util import FileWrapper

import pandas as pd
import requests
from core import utils
from core.feature_flags import all_flags, flag_set, get_feature_file_path
from core.label_config import generate_time_series_json
from core.utils.common import collect_versions
from core.utils.io import find_file
from django.conf import settings
from django.contrib.auth import logout
from django.db.models import CharField, F, Value
from django.http import (
    HttpResponse,
    HttpResponseForbidden,
    HttpResponseNotFound,
    JsonResponse,
)
from django.shortcuts import redirect, render, reverse
from django.utils._os import safe_join
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from drf_yasg.utils import swagger_auto_schema
from io_storages.localfiles.models import LocalFilesImportStorage
from ranged_fileresponse import RangedFileResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


_PARAGRAPH_SAMPLE = None


def main(request):
    user = request.user

    if user.is_authenticated:

        if user.active_organization is None and 'organization_pk' not in request.session:
            logout(request)
            return redirect(reverse('user-login'))

        # business mode access
        if flag_set('fflag_all_feat_dia_1777_ls_homepage_short', user):
            print('redirect to home page')
            return render(request, 'home/home.html')
        else:
            return redirect(reverse('projects:project-index'))

    # not authenticated
    return redirect(reverse('user-login'))


def version_page(request):
    """Get platform version"""
    # update the latest version from pypi response
    # from label_studio.core.utils.common import check_for_the_latest_version
    # check_for_the_latest_version(print_message=False)
    http_page = request.path == '/version/'
    result = collect_versions(force=http_page)

    # html / json response
    if request.path == '/version/':
        # other settings from backend
        if not getattr(settings, 'CLOUD_INSTANCE', False) and request.user.is_superuser:
            result['settings'] = {
                key: str(getattr(settings, key))
                for key in dir(settings)
                if not key.startswith('_') and not hasattr(getattr(settings, key), '__call__')
            }

        result = json.dumps(result, indent=2)
        result = result.replace('},', '},\n').replace('\\n', ' ').replace('\\r', '')
        return HttpResponse('<pre>' + result + '</pre>')
    else:
        return JsonResponse(result)


def health(request):
    """System health info"""
    logger.debug('Got /health request.')
    return HttpResponse(json.dumps({'status': 'UP'}))


def metrics(request):
    """Empty page for metrics evaluation"""
    return HttpResponse('')


class TriggerAPIError(APIView):
    """500 response for testing"""

    authentication_classes = ()
    permission_classes = ()

    @swagger_auto_schema(auto_schema=None)
    def get(self, request):
        raise Exception('test')


def editor_files(request):
    """Get last editor files"""
    response = utils.common.find_editor_files()
    return HttpResponse(json.dumps(response), status=200)


def samples_time_series(request):
    """Generate time series example for preview"""
    time_column = request.GET.get('time', '')
    value_columns = request.GET.get('values', '').split(',')
    time_format = request.GET.get('tf')

    # separator processing
    separator = request.GET.get('sep', ',')
    separator = separator.replace('\\t', '\t')
    aliases = {'dot': '.', 'comma': ',', 'tab': '\t', 'space': ' '}
    if separator in aliases:
        separator = aliases[separator]

    # check headless or not
    header = True
    if all(n.isdigit() for n in [time_column] + value_columns):
        header = False

    # generate all columns for headless csv
    if not header:
        max_column_n = max([int(v) for v in value_columns] + [0])
        value_columns = range(1, max_column_n + 1)

    ts = generate_time_series_json(time_column, value_columns, time_format)
    csv_data = pd.DataFrame.from_dict(ts).to_csv(index=False, header=header, sep=separator).encode('utf-8')

    # generate response data as file
    filename = 'time-series.csv'
    response = HttpResponse(csv_data, content_type='application/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response['filename'] = filename
    return response


def samples_paragraphs(request):
    """Generate paragraphs example for preview"""
    global _PARAGRAPH_SAMPLE

    if _PARAGRAPH_SAMPLE is None:
        with open(find_file('paragraphs.json'), encoding='utf-8') as f:
            _PARAGRAPH_SAMPLE = json.load(f)
    name_key = request.GET.get('nameKey', 'author')
    text_key = request.GET.get('textKey', 'text')

    result = []
    for line in _PARAGRAPH_SAMPLE:
        result.append({name_key: line['author'], text_key: line['text']})

    return HttpResponse(json.dumps(result), content_type='application/json')


def heidi_tips(request):
    """Fetch live tips from github raw liveContent.json to avoid caching and client side CORS issues"""
    url = 'https://raw.githubusercontent.com/HumanSignal/label-studio/refs/heads/develop/web/apps/labelstudio/src/components/HeidiTips/liveContent.json'

    response = None
    try:
        response = requests.get(
            url,
            headers={'Cache-Control': 'no-cache', 'Content-Type': 'application/json', 'Accept': 'application/json'},
            timeout=5,
        )
        # Raise an exception for bad status codes to avoid caching
        response.raise_for_status()
    # Catch all exceptions and return either the status code if there was a response, or default to 404 if there are network issues
    # This is done this way to catch thrown exceptions from the request itself which will occur for air-gapped environments
    except Exception:
        # Any other HTTP error will return the error code, and other errors like connection/timeout errors will be a 404
        content = {}
        status_code = 404
        if response is not None:
            content['detail'] = response.reason
            status_code = response.status_code
        return HttpResponse(json.dumps(content), content_type='application/json', status=status_code)

    return HttpResponse(response.content, content_type='application/json')


@swagger_auto_schema(methods=['GET'], auto_schema=None)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def localfiles_data(request):
    """Serving files for LocalFilesImportStorage"""
    user = request.user
    path = request.GET.get('d')
    if settings.LOCAL_FILES_SERVING_ENABLED is False:
        return HttpResponseForbidden(
            "Serving local files can be dangerous, so it's disabled by default. "
            'You can enable it with LOCAL_FILES_SERVING_ENABLED environment variable, '
            'please check docs: https://labelstud.io/guide/storage.html#Local-storage'
        )

    local_serving_document_root = settings.LOCAL_FILES_DOCUMENT_ROOT
    if path and request.user.is_authenticated:
        path = posixpath.normpath(path).lstrip('/')
        full_path = Path(safe_join(local_serving_document_root, path))
        user_has_permissions = False

        # Try to find Local File Storage connection based prefix:
        # storage.path=/home/user, full_path=/home/user/a/b/c/1.jpg =>
        # full_path.startswith(path) => True
        localfiles_storage = LocalFilesImportStorage.objects.annotate(
            _full_path=Value(os.path.dirname(full_path), output_field=CharField())
        ).filter(_full_path__startswith=F('path'))
        if localfiles_storage.exists():
            user_has_permissions = any(storage.project.has_permission(user) for storage in localfiles_storage)

        if user_has_permissions and os.path.exists(full_path):
            content_type, encoding = mimetypes.guess_type(str(full_path))
            content_type = content_type or 'application/octet-stream'
            return RangedFileResponse(request, open(full_path, mode='rb'), content_type)
        else:
            return HttpResponseNotFound()

    return HttpResponseForbidden()


def static_file_with_host_resolver(path_on_disk, content_type):
    """Load any file, replace {{HOSTNAME}} => settings.HOSTNAME, send it as http response"""
    path_on_disk = os.path.join(os.path.dirname(__file__), path_on_disk)

    def serve_file(request):
        with open(path_on_disk, 'r') as f:
            body = f.read()
            body = body.replace('{{HOSTNAME}}', settings.HOSTNAME)

            out = io.StringIO()
            out.write(body)
            out.seek(0)

            wrapper = FileWrapper(out)
            response = HttpResponse(wrapper, content_type=content_type)
            response['Content-Length'] = len(body)
            return response

    return serve_file


def feature_flags(request):
    user = request.user
    if not user.is_authenticated:
        return HttpResponseForbidden()

    flags = all_flags(request.user)
    flags['$system'] = {
        'FEATURE_FLAGS_DEFAULT_VALUE': settings.FEATURE_FLAGS_DEFAULT_VALUE,
        'FEATURE_FLAGS_FROM_FILE': settings.FEATURE_FLAGS_FROM_FILE,
        'FEATURE_FLAGS_FILE': get_feature_file_path(),
        'VERSION_EDITION': settings.VERSION_EDITION,
        'CLOUD_INSTANCE': settings.CLOUD_INSTANCE if hasattr(settings, 'CLOUD_INSTANCE') else None,
    }

    return HttpResponse('<pre>' + json.dumps(flags, indent=4) + '</pre>', status=200)


@csrf_exempt
@require_http_methods(['POST', 'GET'])
def collect_metrics(request):
    """Lightweight endpoint to collect usage metrics from the frontend only when COLLECT_ANALYTICS is enabled"""
    return HttpResponse(status=204)

def custom_landing(request):
    """Custom landing page for project setup"""
    from django.shortcuts import render, redirect
    from django.urls import reverse
    from django.contrib.auth import logout
    
    user = request.user
    if not user.is_authenticated:
        return redirect(reverse('user-login'))
    
    if user.active_organization is None:
        logout(request)
        return redirect(reverse('user-login'))
    
    return render(request, 'core/custom_landing.html', {
        'user': user,
        'title': 'Project Setup'
    })

def validate_folder_path(request):
    """AJAX endpoint to validate folder paths"""
    from django.http import JsonResponse
    import json
    import os
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        path = data.get('path', '').strip()
        folder_type = data.get('type', '')
        
        if not path:
            return JsonResponse({'valid': False, 'message': 'Path is required'})
        
        if not os.path.exists(path):
            return JsonResponse({'valid': False, 'message': 'Path does not exist'})
        
        if not os.path.isdir(path):
            return JsonResponse({'valid': False, 'message': 'Path is not a directory'})
        
        files = os.listdir(path)
        if folder_type == 'images':
            valid_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
            image_files = [f for f in files if any(f.lower().endswith(ext) for ext in valid_extensions)]
            file_count = len(image_files)
            if file_count == 0:
                return JsonResponse({'valid': False, 'message': 'No image files found'})
        elif folder_type == 'json':
            json_files = [f for f in files if f.lower().endswith('.json')]
            file_count = len(json_files)
            if file_count == 0:
                return JsonResponse({'valid': False, 'message': 'No JSON files found'})
        else:
            file_count = len(files)
        
        return JsonResponse({
            'valid': True, 
            'message': f'Found {file_count} {folder_type} files',
            'file_count': file_count
        })
        
    except Exception as e:
        return JsonResponse({'valid': False, 'message': f'Error: {str(e)}'})

def get_sample_json(request):
    """AJAX endpoint to get sample JSON from folder"""
    from django.http import JsonResponse
    import json
    import os
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        path = data.get('path', '').strip()
        
        if not path or not os.path.exists(path):
            return JsonResponse({'success': False, 'message': 'Invalid path'})
        
        json_files = [f for f in os.listdir(path) if f.lower().endswith('.json')]
        if not json_files:
            return JsonResponse({'success': False, 'message': 'No JSON files found'})
        
        # Read first JSON file
        sample_file = os.path.join(path, json_files[0])
        with open(sample_file, 'r') as f:
            sample_data = json.load(f)
        
        return JsonResponse({'success': True, 'sample_json': sample_data})
        
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'Error reading JSON: {str(e)}'})


def create_project_from_config(request):
    """Create a project with pre-configured columns from JSON keys"""
    from django.http import JsonResponse
    from projects.models import Project
    from django.contrib.auth.decorators import login_required
    import json
    import os
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        project_name = data.get('project_name', '').strip()
        project_description = data.get('project_description', '').strip()
        image_path = data.get('image_path', '').strip()
        json_path = data.get('json_path', '').strip()
        selected_keys = data.get('selected_keys', [])
        
        if not all([project_name, image_path, json_path, selected_keys]):
            return JsonResponse({'error': 'Missing required fields'}, status=400)
        
        # Create the project
        project = Project.objects.create(
            title=project_name,
            description=project_description,
            created_by=request.user,
            organization=request.user.active_organization
        )
        
        # TODO: Import tasks from JSON files with selected keys as columns
        # This will be implemented in the next phase
        
        return JsonResponse({
            'success': True,
            'project_id': project.id,
            'message': f'Project "{project_name}" created successfully'
        })
        
    except Exception as e:
        return JsonResponse({'error': f'Failed to create project: {str(e)}'}, status=500)