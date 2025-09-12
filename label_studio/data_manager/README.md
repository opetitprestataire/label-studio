# Label Studio Data Manager

The Data Manager is a core component of Label Studio that provides advanced filtering, ordering, selection, and bulk operations on tasks. It serves as the backend for the Data Manager UI and supports complex querying capabilities for tasks within projects.

## Architecture Overview

The Data Manager consists of several key components working together:

### Core Components

#### 1. **managers.py** - Query Management Engine
- **TaskQuerySet**: Custom queryset with `prepared()` method for applying filters, ordering, and selections
- **PreparedTaskManager**: Manager providing task annotation and filtering capabilities
- **Filtering System**: Supports complex filters with operators (equal, contains, regex, between, etc.)
- **Ordering System**: Handles task ordering with support for data fields and annotations
- **Field Annotation**: Dynamically annotates querysets with computed fields

#### 2. **prepare_params.py** - Data Structures
- **PrepareParams**: Main configuration object containing project, filters, ordering, and selectedItems
- **Filters**: Structure for defining filter conditions with conjunction (AND/OR) logic
- **SelectedItems**: Handles task selection (all with exclusions or specific inclusions)
- **Column Definitions**: Enum defining all available filterable/orderable columns

#### 3. **functions.py** - Helper Functions
- **get_all_columns()**: Returns available columns for project data manager
- **get_prepare_params()**: Extracts prepare_params from requests or views
- **get_prepared_queryset()**: Creates filtered queryset from request parameters
- **preprocess_field_name()**: Securely processes field names to prevent ORM vulnerabilities

#### 4. **models.py** - Database Models
- **View**: Saves user-defined data manager views with filters and selections
- **FilterGroup**: Groups filters with conjunction logic (AND/OR)
- **Filter**: Individual filter conditions with column, operator, type, and value

#### 5. **api.py** - REST API Layer
- **ViewAPI**: CRUD operations for saved views
- **TaskListAPI**: Main endpoint for retrieving filtered/ordered tasks
- **ProjectColumnsAPI**: Returns available columns for filtering/ordering
- **ProjectActionsAPI**: Performs bulk actions on selected tasks

#### 6. **actions/** - Bulk Operations
- **Basic Actions**: delete_tasks, delete_annotations, predictions_to_annotations
- **Advanced Actions**: remove_duplicates, cache_labels, next_task
- **Experimental Actions**: Various ML-related batch operations

## Key Classes and Methods

### TaskQuerySet.prepared()
```python
def prepared(self, prepare_params=None):
    """Apply filters, ordering and selected items to queryset"""
    queryset = apply_filters(queryset, prepare_params.filters, project, request)
    queryset = apply_ordering(queryset, prepare_params.ordering, project, request)
    # Apply selectedItems filtering
    return queryset
```

### PreparedTaskManager
```python
def get_queryset(self, fields_for_evaluation=None, prepare_params=None, all_fields=False):
    """Get annotated queryset with computed fields"""
    
def only_filtered(self, prepare_params=None):
    """Get queryset with only filters/ordering applied"""
```

## Filter System

### Supported Operators
- **Comparison**: `equal`, `not_equal`, `greater`, `less`, `greater_or_equal`, `less_or_equal`
- **Range**: `in` (between min/max), `not_in`
- **List**: `in_list`, `not_in_list` 
- **Text**: `contains`, `not_contains`, `regex`
- **Existence**: `empty` (null/empty check)

### Supported Data Types
- **Number**: Float or Integer values
- **Datetime**: ISO format datetime strings
- **Boolean**: True/false values
- **String**: Text values
- **List**: Array of values
- **Unknown**: Auto-converted to string

### Filter Conjunctions
- **AND**: All filters must match (`conjunction: "and"`)
- **OR**: Any filter can match (`conjunction: "or"`)

## Column Types

### Task Columns
- **id**: Task ID (Number)
- **inner_id**: Internal task ID starting from 1 (Number)
- **created_at/updated_at**: Timestamps (Datetime)
- **total_annotations/total_predictions**: Counts (Number)
- **completed_at**: Last annotation completion time (Datetime)
- **annotators**: Users who completed task (List of user IDs)
- **file_upload**: Original upload filename (String)
...

### Data Columns
- **data.{field}**: Access task data fields (e.g., `data.image`, `data.text`)
- Dynamic based on project configuration and imported data

### Annotation/Prediction Columns
- **annotations_results**: Annotation results JSON (String)
- **predictions_results**: Prediction results JSON (String)
- **predictions_score**: Average prediction confidence (Number)
- **annotations_ids**: Comma-separated annotation IDs (String)

## Usage Examples

### Basic Filtering Example

```python
from data_manager.prepare_params import PrepareParams, Filters, Filter, ConjunctionEnum, SelectedItems

# Create filters for tasks with ID greater than 100 and containing specific text
filters = Filters(
    conjunction=ConjunctionEnum.AND,
    items=[
        Filter(
            filter="filter:tasks:id",
            operator="greater",
            type="Number", 
            value=100
        ),
        Filter(
            filter="filter:tasks:data.text",
            operator="contains",
            type="String",
            value="hello world"
        )
    ]
)

# Create ordering (descending by creation date)
ordering = ["-tasks:created_at"]

# Select all tasks except specific ones
selected_items = SelectedItems(
    all=True,
    excluded=[101, 102, 103]
)

# Create prepare_params
prepare_params = PrepareParams(
    project=1,
    filters=filters,
    ordering=ordering,
    selectedItems=selected_items
)

# Get filtered queryset
from tasks.models import Task
queryset = Task.prepared.only_filtered(prepare_params=prepare_params)

# Or get annotated queryset with computed fields
fields_for_evaluation = ['annotators', 'total_annotations', 'completed_at']
queryset = Task.prepared.get_queryset(
    fields_for_evaluation=fields_for_evaluation,
    prepare_params=prepare_params
)
```

### Advanced Filtering Example

```python
# Complex filter with date ranges and multiple conditions
filters = Filters(
    conjunction=ConjunctionEnum.OR,
    items=[
        # Tasks completed in date range
        Filter(
            filter="filter:tasks:completed_at",
            operator="in",
            type="Datetime",
            value={
                "min": "2024-01-01T00:00:00.000Z",
                "max": "2024-12-31T23:59:59.999Z"
            }
        ),
        # Tasks with specific annotators
        Filter(
            filter="filter:tasks:annotators",
            operator="contains",
            type="List",
            value=42  # User ID
        ),
        # Tasks with high prediction scores
        Filter(
            filter="filter:tasks:predictions_score",
            operator="greater_or_equal", 
            type="Number",
            value=0.9
        )
    ]
)

# Select specific tasks only
selected_items = SelectedItems(
    all=False,
    included=[1, 5, 10, 15, 20]
)

prepare_params = PrepareParams(
    project=1,
    filters=filters,
    ordering=["tasks:predictions_score"],  # Ascending by score
    selectedItems=selected_items
)

queryset = Task.prepared.only_filtered(prepare_params=prepare_params)
```

### API Usage Example

```python
# Using via API (request data structure)
api_request_data = {
    "filters": {
        "conjunction": "and",
        "items": [
            {
                "filter": "filter:tasks:total_annotations",
                "operator": "greater",
                "type": "Number",
                "value": 0
            },
            {
                "filter": "filter:tasks:data.sentiment", 
                "operator": "equal",
                "type": "String",
                "value": "positive"
            }
        ]
    },
    "selectedItems": {
        "all": True,
        "excluded": []
    },
    "ordering": ["-tasks:updated_at"]
}

# This would be processed by get_prepare_params() in the API
```

### Working with Views

```python
from data_manager.models import View

# Create a saved view
view = View.objects.create(
    project_id=1,
    user=user,
    data={
        "filters": {
            "conjunction": "and", 
            "items": [
                {
                    "filter": "filter:tasks:total_annotations",
                    "operator": "equal",
                    "type": "Number",
                    "value": 0
                }
            ]
        },
        "ordering": ["tasks:created_at"]
    }
)

# Load prepare_params from view
prepare_params = view.get_prepare_tasks_params(add_selected_items=True)
queryset = Task.prepared.only_filtered(prepare_params=prepare_params)
```

## Security Considerations

### Filter Security
- Field names are validated to prevent ORM injection attacks
- Only `filter:tasks:*` prefixes allowed by default
- Foreign key traversals (`__`) are restricted unless allowlisted
- Data field access (`data.*`) is safely handled through JSONField

### Permission Checks
- All operations check user permissions on projects
- Actions have permission requirements defined
- Views are filtered by user's organization

## Performance Optimization

### Query Optimization
- Efficient use of Django ORM annotations
- Selective field evaluation based on usage
- Prefetch related objects for serialization
- Pagination support for large datasets

### Caching Strategies
- View configurations are cached
- Column definitions are project-specific
- Queryset annotations are lazily evaluated

## Extension Points

### Custom Actions
```python
# Register custom action
from data_manager.actions import register_action

def my_custom_action(project, queryset, **kwargs):
    # Perform bulk operation on tasks
    return {"processed": queryset.count()}

register_action(
    entry_point=my_custom_action,
    title="My Custom Action",
    order=100,
    permission="projects.change_project"
)
```

### Custom Filters
```python
# Add custom filter expressions (settings.py)
def custom_filter_expressions(filter_obj, field_name, project, request=None):
    if field_name == 'my_custom_field':
        # Return custom Q object
        return Q(custom_condition=filter_obj.value)
    return None

DATA_MANAGER_CUSTOM_FILTER_EXPRESSIONS = 'myapp.functions.custom_filter_expressions'
```

## Common Patterns

### Getting Task Count
```python
prepare_params = get_prepare_params(request, project)
count = Task.prepared.only_filtered(prepare_params=prepare_params).count()
```

### Exporting Filtered Tasks
```python
queryset = Task.prepared.only_filtered(prepare_params=prepare_params)
tasks = list(queryset.values('id', 'data', 'annotations__result'))
```

### Bulk Operations
```python
from data_manager.actions import perform_action

result = perform_action(
    action_id='delete_tasks',
    project=project,
    queryset=queryset,
    user=request.user
)
```

This data manager provides a powerful and flexible system for managing tasks with advanced filtering, ordering, and bulk operations while maintaining security and performance.
