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
        from core.feature_flags import flag_set
        from django.conf import settings

        if not flag_set('fflag_feat_fit_568_finite_state_management'):
            return

        version_edition = getattr(settings, 'VERSION_EDITION', 'Community')

        if version_edition != 'Community':
            logger.info(f'Label Studio FSM: Skipping initialization for {version_edition} edition')
            return

        # Additional safety check: if LSE FSM apps are present, don't initialize
        try:
            from django.apps import apps

            if apps.is_installed('lse_fsm'):
                logger.info('Label Studio FSM: LSE FSM detected, skipping LSO FSM initialization to avoid conflicts')
                return
        except Exception as e:
            # Log but continue - this shouldn't prevent initialization in pure LSO environments
            logger.debug(f'Label Studio FSM: Error checking for LSE apps: {e}')

        logger.info('Label Studio FSM app ready, initializing core integrations for Community edition')

        from .model_extensions import register_fsm_for_core_models

        register_fsm_for_core_models()

        # Import signal handlers to register them (only for Community edition)
        from . import signals  # noqa: F401
