"""
FSM model mixins that can be inherited by Task and Annotation models.

This provides save_with_context functionality to existing models without
changing their inheritance structure.
"""

import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


def add_fsm_methods_to_model(model_class):
    """
    Add FSM context methods to a model class.

    This function can be called to add FSM functionality to existing
    model classes without changing their inheritance.
    """

    def save_with_context(self, context=None, **kwargs):
        """Save the model instance with explicit FSM context."""
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

    # Add methods to the model class
    model_class.save_with_context = save_with_context
    model_class.has_fsm_context = has_fsm_context
    model_class.get_fsm_context = get_fsm_context
    model_class.clear_fsm_context = clear_fsm_context

    logger.debug(f'FSM: Added context methods to {model_class.__name__}')


# Auto-register FSM methods when this module is imported
def register_fsm_for_core_models():
    """Register FSM methods for core Label Studio models."""
    try:
        # Register for Task model
        from tasks.models import Task

        add_fsm_methods_to_model(Task)

        # Register for Annotation model
        from tasks.models import Annotation

        add_fsm_methods_to_model(Annotation)

        # Register for AnnotationDraft model if it exists
        try:
            from tasks.models import AnnotationDraft

            add_fsm_methods_to_model(AnnotationDraft)
        except ImportError:
            pass

        logger.info('FSM: Registered context methods for core models')

    except ImportError as e:
        logger.warning(f'FSM: Could not register context methods for core models: {e}')
