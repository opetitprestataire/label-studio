"""
Base factory classes with FSM context support for Label Studio.

Provides a BaseModelFactory that all model factories should inherit from
to ensure consistent FSM context handling across the application.
"""

import factory


class BaseModelFactory(factory.django.DjangoModelFactory):
    """
    Base factory class that provides FSM context-aware creation.

    All model factories should inherit from this class to support
    the fsm_context parameter for testing FSM signal handling.

    Usage:
        class MyModelFactory(BaseModelFactory):
            field1 = factory.Faker('name')

            class Meta:
                model = MyModel

        # Create instance with FSM context for signal testing
        from fsm.managers import create_api_context
        context = create_api_context(user=user, operation='test_operation')
        instance = MyModelFactory(fsm_context=context, field1='test')
    """

    class Meta:
        abstract = True

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override _create to support FSM context-aware creation."""
        fsm_context = kwargs.pop('fsm_context', None)

        if fsm_context:
            # Use create_with_context when FSM context is provided
            manager = model_class.objects
            if hasattr(manager, 'create_with_context'):
                return manager.create_with_context(context=fsm_context, **kwargs)

        # Fall back to normal factory creation
        return super()._create(model_class, *args, **kwargs)
