"""FSM Django App Configuration"""

import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class FsmConfig(AppConfig):
    default_auto_field = 'django.db.models.UUIDField'
    name = 'fsm'
    verbose_name = 'Label Studio FSM'

    def ready(self):
        """Initialize FSM integration when the app is ready"""
        # Check if this is Community edition - only register signals for Community
        from fsm.integrations import is_fsm_enabled

        if not is_fsm_enabled():
            return

        logger.info('Label Studio FSM app ready, initializing core integrations for Community edition')

        from .model_extensions import register_fsm_for_core_models

        register_fsm_for_core_models()

        # Import signal handlers to register them (only for Community edition)
        from . import signals  # noqa: F401
