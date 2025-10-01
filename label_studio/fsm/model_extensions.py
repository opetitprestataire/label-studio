"""
FSM model mixins that can be inherited by Task and Annotation models.

This provides save_with_context functionality to existing models without
changing their inheritance structure.
"""

import logging

from fsm.managers import FSMManagerMixin, FSMModelMixin

logger = logging.getLogger(__name__)


def add_fsm_methods_to_model(model_class):
    """
    Add FSM context methods to a model class.

    This function can be called to add FSM functionality to existing
    model classes without changing their inheritance.
    """
    for attr_name in ['save_with_context', 'has_fsm_context', 'get_fsm_context', 'clear_fsm_context']:
        if hasattr(FSMModelMixin, attr_name):
            setattr(model_class, attr_name, getattr(FSMModelMixin, attr_name))

    for attr_name in ['create_with_context', 'bulk_create_with_context', 'bulk_update_with_context']:
        if hasattr(FSMManagerMixin, attr_name):
            setattr(model_class.objects, attr_name, getattr(FSMManagerMixin, attr_name))


# Auto-register FSM methods when this function is called
def register_fsm_for_core_models():
    """Register FSM methods for core Label Studio models."""
    try:
        from projects.models import Project
        from tasks.models import Annotation, AnnotationDraft, Task

        add_fsm_methods_to_model(Project)
        add_fsm_methods_to_model(Task)
        add_fsm_methods_to_model(Annotation)
        add_fsm_methods_to_model(AnnotationDraft)
        logger.info('FSM: Registered FSM methods for core models')
    except ImportError as e:
        logger.error(f'FSM: Failed to register FSM methods for core models: {e}')
        raise
