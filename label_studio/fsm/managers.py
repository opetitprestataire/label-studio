"""
FSM-aware managers for explicit context handling in Label Studio Open Source.

This module provides manager mixins that add FSM context to model operations,
allowing explicit control over when and how FSM transitions are triggered.
"""

import logging
from typing import Any, Dict

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()
logger = logging.getLogger(__name__)


class FSMManagerMixin:
    """
    Manager mixin that adds FSM-aware methods for model operations.

    This mixin provides create, update, and bulk operation methods that
    automatically attach FSM context to instances, ensuring signals have
    the necessary information for state transitions.
    """

    def create_with_context(self, context=None, **kwargs):
        """
        Create object with explicit context for signals.

        Args:
            context: Dictionary containing context information for FSM signals
                    Expected keys: user_id, organization_id, source, operation, etc.
            **kwargs: Model field values

        Returns:
            Created model instance with FSM context attached
        """
        obj = self.model(**kwargs)

        # Attach context to the instance before saving
        obj._fsm_context = context or {}

        # Log context attachment for debugging
        if context:
            logger.debug(
                'FSM: Creating instance with signal context',
                extra={
                    'event': 'fsm.manager.create_with_context',
                    'model': self.model.__name__,
                    'context': context,
                },
            )

        obj.save()
        return obj

    def bulk_create_with_context(self, objs, context=None, **kwargs):
        """
        Bulk create objects with explicit context for signals.

        Args:
            objs: List of model instances to create
            context: Dictionary containing context information for FSM signals
            **kwargs: Additional arguments for bulk_create

        Returns:
            List of created instances
        """
        context = context or {}

        # Attach context to all objects before bulk creation
        for obj in objs:
            obj._fsm_context = context

        # Log bulk operation for debugging
        if context:
            logger.debug(
                'FSM: Bulk creating instances with signal context',
                extra={
                    'event': 'fsm.manager.bulk_create_with_context',
                    'model': self.model.__name__,
                    'count': len(objs),
                    'context': context,
                },
            )

        return super().bulk_create(objs, **kwargs)

    def bulk_update_with_context(self, objs, fields, context=None, **kwargs):
        """
        Bulk update objects with explicit context for signals.

        Args:
            objs: List of model instances to update
            fields: List of field names to update
            context: Dictionary containing context information for FSM signals
            **kwargs: Additional arguments for bulk_update

        Returns:
            Number of objects updated
        """
        context = context or {}

        # Attach context to all objects before bulk update
        for obj in objs:
            obj._fsm_context = context

        # Log bulk operation for debugging
        if context:
            logger.debug(
                'FSM: Bulk updating instances with signal context',
                extra={
                    'event': 'fsm.manager.bulk_update_with_context',
                    'model': self.model.__name__,
                    'count': len(objs),
                    'fields': fields,
                    'context': context,
                },
            )

        return super().bulk_update(objs, fields, **kwargs)


class FSMModelMixin:
    """
    Model mixin that adds FSM-aware save method and context handling.

    This mixin provides a save_with_context method for models that need
    to trigger FSM transitions with explicit context.
    """

    def save_with_context(self, context=None, **kwargs):
        """
        Save the model instance with explicit FSM context.

        Args:
            context: Dictionary containing context information for FSM signals
            **kwargs: Additional arguments for save()
        """
        # Attach context to the instance before saving
        self._fsm_context = context or {}

        # Log context attachment for debugging
        if context:
            logger.debug(
                'FSM: Saving instance with signal context',
                extra={
                    'event': 'fsm.model.save_with_context',
                    'model': self.__class__.__name__,
                    'instance_id': self.pk,
                    'context': context,
                },
            )

        # Save the instance (triggers signals)
        self.save(**kwargs)

    def has_fsm_context(self) -> bool:
        """Check if this instance has FSM context attached."""
        return hasattr(self, '_fsm_context') and bool(self._fsm_context)

    def get_fsm_context(self) -> Dict[str, Any]:
        """Get the FSM context attached to this instance."""
        return getattr(self, '_fsm_context', {})

    def clear_fsm_context(self):
        """Clear any FSM context from this instance."""
        if hasattr(self, '_fsm_context'):
            delattr(self, '_fsm_context')


# Ready-to-use manager classes


class FSMManager(FSMManagerMixin, models.Manager):
    """
    Manager that includes FSM context methods.

    Usage:
        class MyModel(models.Model):
            name = models.CharField(max_length=100)
            objects = FSMManager()
    """

    pass


# Helper functions to create context dictionaries


def create_api_context(user, request_id=None, **extra):
    """Create context for API operations."""
    context = {
        'source': 'api',
        'user_id': user.id if user else None,
        'request_id': request_id,
    }
    if hasattr(user, 'active_organization') and user.active_organization:
        context['organization_id'] = user.active_organization.id
    context.update(extra)
    return context


def create_worker_context(user_id=None, organization_id=None, operation='worker_task', **extra):
    """Create context for worker operations."""
    context = {
        'source': 'worker',
        'operation': operation,
        'user_id': user_id,
        'organization_id': organization_id,
    }
    context.update(extra)
    return context


def create_admin_context(user, operation='admin_action', **extra):
    """Create context for admin operations."""
    context = {
        'source': 'admin',
        'operation': operation,
        'user_id': user.id if user else None,
    }
    if hasattr(user, 'active_organization') and user.active_organization:
        context['organization_id'] = user.active_organization.id
    context.update(extra)
    return context
