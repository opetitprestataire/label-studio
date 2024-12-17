import datetime
from django.db import models
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class TourState(str, Enum):
    COMPLETED = "completed" 
    SKIPPED = "skipped"


class TourInteractionData(BaseModel):
    """Pydantic model for validating tour interaction data"""
    skipped_at_step: Optional[int] = Field(None, description="Step number where tour was skipped")
    last_viewed_step: Optional[int] = Field(None, description="Last step number viewed")
    completion_date: Optional[datetime.datetime] = Field(None, description="When the tour was completed")
    additional_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Extensible field for additional interaction data")


class UserTour(models.Model):
    """Stores product tour state and interaction data for users"""
    user = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='tours',
        help_text='User who interacted with the tour'
    )
    
    tour_name = models.CharField(
        max_length=256,
        help_text='Unique identifier for the product tour'
    )
    
    state = models.CharField(
        max_length=32,
        choices=[(state.value, state.value) for state in TourState],
        default=TourState.COMPLETED.value,
        help_text='Current state of the tour for this user'
    )

    interaction_data = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional data about user interaction with the tour'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When this tour record was created'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='When this tour record was last updated'
    )

    def __str__(self):
        return f"{self.user.email} - {self.tour_name} ({self.state})"
