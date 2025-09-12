from django.urls import path

from .api import ScatterFilteredIDsAPI, ScatterTasksAPI

app_name = 'scatter'

urlpatterns = [
    path('api/scatter/tasks', ScatterTasksAPI.as_view(), name='scatter-tasks'),
    path('api/scatter/filtered-ids', ScatterFilteredIDsAPI.as_view(), name='scatter-filtered-ids'),
]
