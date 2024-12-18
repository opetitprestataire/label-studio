from enum import Enum
from typing import Any, Dict, Optional

from django.db import models
from pydantic import BaseModel, Field


class ProductTourState(str, Enum):
    READY = 'ready'
    COMPLETED = 'completed'
    SKIPPED = 'skipped'


class ProductTourInteractionData(BaseModel):
    """Pydantic model for validating tour interaction data"""

    index: Optional[int] = Field(None, description='Step number where tour was completed')
    action: Optional[str] = Field(None, description='Action taken during the tour')
    type: Optional[str] = Field(None, description='Type of interaction')
    status: Optional[str] = Field(None, description='Status of the interaction')
    additional_data: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description='Extensible field for additional interaction data'
    )


class UserProductTour(models.Model):
    """Stores product tour state and interaction data for users"""

    user = models.ForeignKey(
        'User', on_delete=models.CASCADE, related_name='tours', help_text='User who interacted with the tour'
    )

    name = models.CharField(
        max_length=256, help_text='Unique identifier for the product tour. Name must match the config name.'
    )

    state = models.CharField(
        max_length=32,
        choices=[(state.value, state.value) for state in ProductTourState],
        default=ProductTourState.READY.value,
        help_text='Current state of the tour for this user: "ready" when tour is initiated, "completed" when user finishes the tour, "skipped" when user cancels the tour.',
    )

    interaction_data = models.JSONField(
        default=dict, blank=True, help_text='Additional data about user interaction with the tour'
    )

    created_at = models.DateTimeField(auto_now_add=True, help_text='When this tour record was created')

    updated_at = models.DateTimeField(auto_now=True, help_text='When this tour record was last updated')

    def __str__(self):
        return f'{self.user.email} - {self.name} ({self.state})'
