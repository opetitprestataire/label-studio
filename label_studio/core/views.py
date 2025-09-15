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


from django.conf import settings
mapping_dir = getattr(settings, "MAPPING_DIR", "/label-studio/data/mappings")

# from django.conf import settings
# mapping_dir = settings.MAPPING_DIR

import json, os
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from core.utils.mapping_utils import build_mapping, save_mapping_csv


logger = logging.getLogger(__name__)


_PARAGRAPH_SAMPLE = None



from django.http import JsonResponse
import json
import os
from datetime import datetime
from django.conf import settings

# Template storage directory
TEMPLATE_DIR = getattr(settings, 'LABEL_TEMPLATES_DIR', os.path.join(settings.BASE_DIR, 'label_templates'))

def ensure_template_dir():
    """Ensure the template directory exists"""
    os.makedirs(TEMPLATE_DIR, exist_ok=True)


def get_nested_value(obj, path):
    """Fetch nested value from dict using dot notation keys."""
    for key in path.split('.'):
        if isinstance(obj, dict):
            obj = obj.get(key)
        else:
            return None
        if obj is None:
            return None
    return obj

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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def localfiles_data(request):
    """Serve user-provided local files dynamically"""
    import posixpath
    import mimetypes
    from pathlib import Path
    from django.http import HttpResponse, HttpResponseForbidden, HttpResponseNotFound

    path = request.GET.get('d')
    if not path:
        return HttpResponseForbidden("Missing file path")

    # Security check - ensure file exists and is accessible
    if not os.path.exists(path):
        return HttpResponseNotFound("File not found")
    
    # Additional security - ensure it's actually a file
    if not os.path.isfile(path):
        return HttpResponseForbidden("Path is not a file")

    try:
        # Determine content type
        content_type, encoding = mimetypes.guess_type(path)
        content_type = content_type or 'application/octet-stream'

        # Read and serve the file
        with open(path, 'rb') as f:
            response = HttpResponse(f.read(), content_type=content_type)
            
        # Add headers for better browser handling
        if content_type.startswith('image/'):
            response['Cache-Control'] = 'public, max-age=3600'
            
        return response
        
    except Exception as e:
        logger.error(f"Error serving file {path}: {str(e)}")
        return HttpResponseNotFound("Error reading file")




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

def get_label_templates(request):
    """API endpoint to get all available templates - only custom now"""
    try:
        ensure_template_dir()
        
        # Get saved custom templates only
        custom_templates = {}
        try:
            for filename in os.listdir(TEMPLATE_DIR):
                if filename.endswith('.json'):
                    template_id = filename[:-5]  # Remove .json extension
                    with open(os.path.join(TEMPLATE_DIR, filename), 'r') as f:
                        template_data = json.load(f)
                        custom_templates[template_id] = template_data
        except OSError:
            pass  # Directory doesn't exist or is empty
        
        return JsonResponse({
            'success': True,
            'custom': custom_templates
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })



def save_label_template(request):
    """API endpoint to save a custom template"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Only POST allowed'})
    
    try:
        data = json.loads(request.body)
        template_id = data.get('template_id', '').strip()
        name = data.get('name', '').strip()
        description = data.get('description', '').strip()
        config = data.get('config', '').strip()
        
        if not all([template_id, name, config]):
            return JsonResponse({
                'success': False, 
                'error': 'Template ID, name, and config are required'
            })
        
        # Validate template_id (alphanumeric + underscores only)
        import re
        if not re.match(r'^[a-zA-Z0-9_]+$', template_id):
            return JsonResponse({
                'success': False,
                'error': 'Template ID must contain only letters, numbers, and underscores'
            })
        
        ensure_template_dir()
        
        template_data = {
            'name': name,
            'description': description,
            'config': config,
            'supports_text_fields': True,
            'created_by': request.user.username if request.user.is_authenticated else 'unknown',
            'created_at': json.dumps(datetime.now(), default=str)
        }
        
        # Save template
        template_path = os.path.join(TEMPLATE_DIR, f'{template_id}.json')
        with open(template_path, 'w') as f:
            json.dump(template_data, f, indent=2)
        
        return JsonResponse({
            'success': True,
            'message': f'Template "{name}" saved successfully',
            'template_id': template_id
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })
# ----------------------------
# At the top of views.py
# ----------------------------
def generate_label_config_from_template(template_config, selected_keys):
    """Generate Label Studio config from template and selected JSON keys"""
    
    # Generate text displays for selected JSON keys
    text_displays = []
    for key in selected_keys:
        field_name = key.split('.')[-1]
        display_name = field_name.replace('_', ' ').title()
        text_displays.append(f'  <Text name="{field_name}_display" value="${field_name}" />')
    
    text_displays_str = '\n'.join(text_displays)
    if text_displays_str:
        text_displays_str = f'\n{text_displays_str}\n'
    
    # Replace placeholder in template
    final_config = template_config.replace('{text_displays}', text_displays_str)
    
    return final_config

# ----------------------------
# Updated create_project_from_config
# ----------------------------
def create_project_from_config(request):
    """Create a project with pre-configured columns from JSON keys and import tasks"""
    from django.http import JsonResponse
    from projects.models import Project, Task
    import json
    import os
    from django.db import transaction

    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body)
        project_name = data.get('project_name', '').strip()
        project_description = data.get('project_description', '').strip()
        image_path = data.get('image_path', '').strip()
        json_path = data.get('json_path', '').strip()
        selected_keys = data.get('selected_keys', [])
        
        # Template selection - only custom templates now
        selected_template = data.get('selected_template', '')
        custom_config = data.get('custom_config', '')

        if not all([project_name, image_path, json_path, selected_keys]):
            return JsonResponse({'error': 'Missing required fields'}, status=400)

        # Create the project
        project = Project.objects.create(
            title=project_name,
            description=project_description,
            created_by=request.user,
            organization=request.user.active_organization
        )

        # Generate label configuration
        if custom_config:
            # Use custom configuration provided by user
            label_config = generate_label_config_from_template(custom_config, selected_keys)
        elif selected_template:
            # Load custom template
            template_path = os.path.join(TEMPLATE_DIR, f'{selected_template}.json')
            if os.path.exists(template_path):
                with open(template_path, 'r') as f:
                    template_data = json.load(f)
                label_config = generate_label_config_from_template(template_data['config'], selected_keys)
            else:
                return JsonResponse({'error': 'Template not found'}, status=400)
        else:
            # Default basic image classification template
            default_config = '''<View>
  <Image name="image" value="$image" zoom="true" zoomBy="1.5" zoomControl="true"/>
  {text_displays}
  
  <Choices name="label" toName="image" choice="single">
    <Choice value="positive" background="green"/>
    <Choice value="negative" background="red"/>
    <Choice value="neutral" background="gray"/>
  </Choices>
</View>'''
            label_config = generate_label_config_from_template(default_config, selected_keys)

        project.label_config = label_config
        project.save()

        # Rest of the function remains the same...
        # Get all image files
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
        image_files = []
        
        try:
            all_files = os.listdir(image_path)
            image_files = [f for f in all_files if any(f.lower().endswith(ext) for ext in image_extensions)]
        except OSError:
            return JsonResponse({'error': 'Cannot read image directory'}, status=400)

        if not image_files:
            return JsonResponse({'error': 'No image files found in the specified directory'}, status=400)

        # Get all JSON files
        json_files = []
        try:
            all_files = os.listdir(json_path)
            json_files = [f for f in all_files if f.lower().endswith('.json')]
        except OSError:
            return JsonResponse({'error': 'Cannot read JSON directory'}, status=400)

        if not json_files:
            return JsonResponse({'error': 'No JSON files found in the specified directory'}, status=400)

        # Create mapping from base filename to image files
        image_map = {}
        for img_file in image_files:
            base_name = os.path.splitext(img_file)[0]
            image_map[base_name] = img_file

        imported_count = 0

        with transaction.atomic():
            for json_file in json_files:
                file_path = os.path.join(json_path, json_file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data_content = json.load(f)
                    
                    # Ensure data_content is always a list
                    if isinstance(data_content, dict):
                        data_list = [data_content]
                    else:
                        data_list = data_content if isinstance(data_content, list) else [data_content]
                    
                    # Base name for matching with images
                    json_base_name = os.path.splitext(json_file)[0]
                    
                    for idx, data_obj in enumerate(data_list):
                        # Build task data with selected keys
                        task_data = {}
                        
                        # Add image if available
                        image_filename = image_map.get(json_base_name)
                        if image_filename:
                            # Create the URL that Label Studio can access
                            full_image_path = os.path.join(image_path, image_filename)
                            task_data["image"] = f"/data/local-files/?d={full_image_path}"
                        
                        # Add selected JSON keys
                        for key in selected_keys:
                            value = get_nested_value(data_obj, key)
                            if value is not None:
                                # Use the leaf name of the key as the field name
                                field_name = key.split('.')[-1]
                                task_data[field_name] = value

                        # Only create task if we have some data
                        if task_data:
                            Task.objects.create(
                                project=project,
                                data=task_data
                            )
                            imported_count += 1
                            
                except Exception as file_err:
                    logger.error(f"Error importing {json_file}: {file_err}")
                    continue

        if imported_count == 0:
            # Delete project if no tasks were created
            project.delete()
            return JsonResponse({'error': 'No tasks were created successfully'}, status=400)

        return JsonResponse({
            'success': True,
            'project_id': project.id,
            'message': f'Project "{project_name}" created successfully with {imported_count} tasks imported'
        })

    except Exception as e:
        logger.error(f"Failed to create project: {str(e)}")
        return JsonResponse({'error': f'Failed to create project: {str(e)}'}, status=500)




def discover_mapping(request, project_id):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)
    body = json.loads(request.body)
    json_sample = body.get("json")
    expected_keys = body.get("expected_keys", [])

    if not json_sample or not expected_keys:
        return JsonResponse({"error": "json + expected_keys required"}, status=400)

    mapping = infer_mapping_from_json(json_sample, expected_keys)

    # Save mapping for this project (db or file)
    with open(f"/label-studio/data/mappings/{project_id}.json", "w") as f:
        json.dump(mapping, f)

    return JsonResponse({"mapping": mapping})


@csrf_exempt
def upload_with_mapping(request, project_id):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    body = json.loads(request.body)
    json_list = body.get("json")

    if isinstance(json_list, dict):
        json_list = [json_list]

    # Load mapping
    with open(f"/label-studio/data/mappings/{project_id}.json", "r") as f:
        mapping = json.load(f)

    flat_data = process_json_list(json_list, mapping)

    return JsonResponse({
        "mapping_used": mapping,
        "data": flat_data
    })

@csrf_exempt
def generate_mapping(request):
    """Accepts JSON with json_path and selected_keys and saves mapping.json"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Only POST allowed'}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    json_path = data.get('json_path')
    selected_keys = data.get('selected_keys', [])

    if not json_path or not selected_keys:
        return JsonResponse(
            {'success': False, 'error': 'json_path and selected_keys are required'},
            status=400
        )

    # create a "mappings" directory under BASE_DIR automatically
    mapping_dir = os.path.join(settings.BASE_DIR, 'mappings')
    os.makedirs(mapping_dir, exist_ok=True)

    # save mapping file
    mapping_file = os.path.join(mapping_dir, 'mapping.json')
    with open(mapping_file, 'w') as f:
        json.dump({'json_path': json_path, 'selected_keys': selected_keys}, f)

    return JsonResponse({'success': True, 'mapping_file': mapping_file})




def delete_label_template(request):
    """API endpoint to delete a custom template"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Only POST allowed'})
    
    try:
        data = json.loads(request.body)
        template_id = data.get('template_id', '').strip()
        
        if not template_id:
            return JsonResponse({
                'success': False, 
                'error': 'Template ID is required'
            })
        
        ensure_template_dir()
        
        # Check if template exists
        template_path = os.path.join(TEMPLATE_DIR, f'{template_id}.json')
        if not os.path.exists(template_path):
            return JsonResponse({
                'success': False,
                'error': 'Template not found'
            })
        
        # Delete the template file
        os.remove(template_path)
        
        return JsonResponse({
            'success': True,
            'message': f'Template deleted successfully'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })


        
def generate_label_config_with_images(selected_keys):
    """Generate Label Studio XML configuration that includes images and selected JSON keys"""
    
    config_parts = ['<View>']
    
    # Add image display
    config_parts.append('  <Image name="image" value="$image" zoom="true" zoomBy="1.5" zoomControl="true"/>')
    
    # Add text displays for each selected key
    for key in selected_keys:
        # Clean key name for display (use leaf name)
        field_name = key.split('.')[-1]
        display_name = field_name.replace('_', ' ').title()
        
        # Add text display for this field
        config_parts.append(f'  <Text name="{field_name}_display" value="${field_name}" />')
    
    # Add classification interface (you can customize this based on your needs)
    config_parts.extend([
        '',
        '  <!-- Classification Interface -->',
        '  <Choices name="label" toName="image" choice="single">',
        '    <Choice value="positive" background="green"/>',
        '    <Choice value="negative" background="red"/>',
        '    <Choice value="neutral" background="gray"/>',
        '  </Choices>',
        '',
        '</View>'
    ])
    
    return '\n'.join(config_parts)