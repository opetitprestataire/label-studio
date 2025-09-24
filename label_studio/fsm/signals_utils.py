"""
Utility functions for FSM signal handling in Label Studio Open Source.

This module provides utilities for checking signal context and determining
whether FSM processing should occur based on feature flags and context.
"""

import logging

from core.feature_flags import flag_set
from django.conf import settings

logger = logging.getLogger(__name__)


def should_process_fsm_signal(instance, user='auto'):
    """
    Check if FSM signal processing should occur for an instance.

    With the context-aware approach, signals only process when:
    1. FSM feature flag is enabled
    2. Instance has _fsm_context (ensuring explicit user context)

    Args:
        instance: Model instance that triggered the signal
        user: User for feature flag evaluation (fallback if no context)

    Returns:
        bool: True if FSM signal processing should proceed
    """
    # Check if FSM is enabled at all
    if not getattr(settings, 'FSM_SIGNALS_ENABLED', True):
        return False

    # Context-aware approach: only process signals if instance has _fsm_context
    has_context = hasattr(instance, '_fsm_context') and bool(instance._fsm_context)
    if not has_context:
        logger.debug(
            'FSM: Skipping signal - no _fsm_context',
            extra={
                'event': 'fsm.signal_skipped_no_context',
                'entity_type': instance._meta.label_lower,
                'entity_id': instance.pk,
            },
        )
        return False

    # Check the FSM flag with context user
    context = instance._fsm_context
    context_user_id = context.get('user_id')
    if context_user_id:
        try:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            context_user = User.objects.get(id=context_user_id)
        except (ValueError, TypeError, User.DoesNotExist):
            context_user = user
    else:
        context_user = user

    return flag_set('fflag_feat_fit_568_finite_state_management', user=context_user)


def get_user_from_context(instance, fallback_user=None):
    """
    Get user from signal context or fallback to provided user.

    Args:
        instance: Model instance with potential _fsm_context
        fallback_user: User to use if no context user found

    Returns:
        User instance or None
    """
    # Try to get user from context
    context = getattr(instance, '_fsm_context', {})
    user_id = context.get('user_id')

    if user_id:
        try:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            return User.objects.get(id=user_id)
        except (ValueError, TypeError, User.DoesNotExist):
            pass

    # Fallback to provided user or instance attributes
    return fallback_user


def get_organization_from_context(instance):
    """
    Get organization_id from signal context.

    Args:
        instance: Model instance with potential _fsm_context

    Returns:
        Organization ID or None
    """
    context = getattr(instance, '_fsm_context', {})
    return context.get('organization_id')


def log_signal_processing(instance, operation, user=None):
    """
    Log FSM signal processing for debugging.

    Args:
        instance: Model instance being processed
        operation: Operation being performed (create, update, delete, etc.)
        user: User performing the operation
    """
    context = getattr(instance, '_fsm_context', {})

    logger.debug(
        f'FSM: Processing {operation} signal with context',
        extra={
            'event': f'fsm.signal_{operation}',
            'entity_type': instance._meta.label_lower,
            'entity_id': instance.pk,
            'user_id': user.id if user else None,
            'context': context,
        },
    )
