"""
Tests for the context-aware FSM approach.

This module tests the new context-aware FSM functionality that provides
explicit control over when FSM signals are processed.
"""

from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.test import TestCase
from fsm.managers import FSMManager, create_api_context, create_worker_context

User = get_user_model()


@pytest.mark.django_db
class TestContextAwareFSM(TestCase):
    """Test the context-aware FSM functionality."""

    def setUp(self):
        """Set up test fixtures."""
        self.user = User.objects.create_user(username='test_user', email='test@example.com')

    def test_create_api_context(self):
        """Test creating API context."""
        context = create_api_context(user=self.user, request_id='req-123', operation='test_operation')

        expected = {'source': 'api', 'user_id': self.user.id, 'request_id': 'req-123', 'operation': 'test_operation'}

        self.assertEqual(context['source'], expected['source'])
        self.assertEqual(context['user_id'], expected['user_id'])
        self.assertEqual(context['request_id'], expected['request_id'])
        self.assertEqual(context['operation'], expected['operation'])

    def test_create_worker_context(self):
        """Test creating worker context."""
        context = create_worker_context(user=self.user, organization_id=1, operation='batch_process')

        expected = {
            'source': 'worker',
            'operation': 'batch_process',
            'user_id': self.user.id,
            'user': self.user,
            'organization_id': 1,
        }

        self.assertEqual(context, expected)

    @patch('fsm.managers.logger')
    def test_fsm_manager_create_with_context(self, mock_logger):
        """Test FSM manager create with context."""
        # Create a mock model class
        mock_model = MagicMock()
        mock_model.__name__ = 'TestModel'  # Add required __name__ attribute
        mock_instance = MagicMock()
        mock_model.return_value = mock_instance

        # Create FSM manager instance
        manager = FSMManager()
        manager.model = mock_model

        # Create with context
        context = {'user_id': self.user.id, 'source': 'api'}
        manager.create_with_context(context=context, name='test_object')

        # Verify instance creation
        mock_model.assert_called_once_with(name='test_object')

        # Verify context attachment
        self.assertEqual(mock_instance._fsm_context, context)

        # Verify save was called
        mock_instance.save.assert_called_once()

        # Verify logging
        mock_logger.debug.assert_called_once()

    @patch('fsm.managers.logger')
    @patch('django.db.models.Manager.bulk_create')
    def test_fsm_manager_bulk_create_with_context(self, mock_bulk_create, mock_logger):
        """Test FSM manager bulk create with context."""
        # Create mock objects
        mock_obj1 = MagicMock()
        mock_obj2 = MagicMock()
        objs = [mock_obj1, mock_obj2]

        # Mock the Django bulk_create to return the objects
        mock_bulk_create.return_value = objs

        # Create FSM manager instance
        manager = FSMManager()
        manager.model = MagicMock()
        manager.model.__name__ = 'TestModel'  # Add required __name__ attribute

        # Bulk create with context
        context = {'user_id': self.user.id, 'source': 'worker'}
        manager.bulk_create_with_context(objs=objs, context=context, batch_size=100)

        # Verify context was attached to all objects
        self.assertEqual(mock_obj1._fsm_context, context)
        self.assertEqual(mock_obj2._fsm_context, context)

        # Verify Django bulk_create was called
        mock_bulk_create.assert_called_once_with(objs, batch_size=100)

        # Verify logging
        mock_logger.debug.assert_called_once()

    @patch('fsm.signals.should_process_fsm_signal')
    def test_fsm_context_checking(self, mock_should_process):
        """Test that signals check for context appropriately."""
        from fsm.signals import handle_model_state_transitions

        # Create mock task instance and sender
        mock_sender = MagicMock()
        mock_sender.__name__ = 'Task'
        mock_task = MagicMock()
        mock_task._meta.label_lower = 'task'
        mock_task.pk = 1
        # Ensure no updated_by attribute to avoid fallback user
        del mock_task.updated_by

        # Test 1: No context - should_process_fsm_signal should be called with task
        mock_should_process.return_value = False
        handle_model_state_transitions(sender=mock_sender, instance=mock_task, created=True)

        # Verify should_process_fsm_signal was called with the instance
        mock_should_process.assert_called_with(mock_task)

        # Test 2: With context - should extract user from context
        mock_task._fsm_context = {'user_id': self.user.id}
        mock_should_process.reset_mock()
        mock_should_process.return_value = False

        handle_model_state_transitions(sender=mock_sender, instance=mock_task, created=True)

        # Should have been called with the task instance
        mock_should_process.assert_called()

    @patch('fsm.signals_utils.flag_set')
    def test_should_process_fsm_context_aware_mode(self, mock_flag_set):
        """Test signal processing in context-aware mode."""
        from fsm.signals_utils import should_process_fsm_signal

        # Create mock instance
        mock_instance = MagicMock()
        mock_instance._meta.label_lower = 'task'
        mock_instance.pk = 1
        # Ensure no _fsm_context attribute
        if hasattr(mock_instance, '_fsm_context'):
            delattr(mock_instance, '_fsm_context')

        # Test 1: FSM enabled, no context -> skip
        mock_flag_set.return_value = True

        # No context
        result = should_process_fsm_signal(mock_instance, user=self.user)
        self.assertFalse(result)  # Should skip - no context

        # Test 2: FSM enabled, with context -> process
        mock_instance._fsm_context = {'user_id': self.user.id}
        result = should_process_fsm_signal(mock_instance, user=self.user)
        self.assertTrue(result)  # Should process - has context

        # Test 3: FSM disabled -> skip regardless of context
        mock_flag_set.return_value = False
        # Keep the context from test 2 to verify FSM disabled overrides context
        result = should_process_fsm_signal(mock_instance, user=self.user)
        self.assertFalse(result)  # Should skip - FSM disabled

    def test_context_helper_functions(self):
        """Test the context helper functions."""
        from fsm.managers import create_admin_context

        # Test admin context
        admin_context = create_admin_context(user=self.user, operation='admin_bulk_update', extra_field='extra_value')

        expected = {
            'source': 'admin',
            'operation': 'admin_bulk_update',
            'user_id': self.user.id,
            'extra_field': 'extra_value',
        }

        for key, value in expected.items():
            self.assertEqual(admin_context[key], value)

    @patch('fsm.managers.logger')
    def test_model_save_with_context(self, mock_logger):
        """Test model save_with_context functionality."""
        from fsm.managers import FSMModelMixin

        # Create a mock model instance
        mock_instance = MagicMock()
        mock_instance.__class__.__name__ = 'TestModel'
        mock_instance.pk = 1

        # Add FSM methods
        FSMModelMixin.save_with_context.__get__(mock_instance, type(mock_instance))

        # Call save_with_context
        context = {'user_id': self.user.id, 'source': 'test'}

        # Manually call the method since we can't easily bind it
        FSMModelMixin.save_with_context(mock_instance, context=context)

        # Verify context was attached
        self.assertEqual(mock_instance._fsm_context, context)

        # Verify save was called
        mock_instance.save.assert_called_once()

    def test_fsm_model_mixin_helper_methods(self):
        """Test FSM model mixin helper methods."""
        from fsm.managers import FSMModelMixin

        # Create mock instance
        mock_instance = MagicMock()
        # Remove the _fsm_context attribute entirely
        if hasattr(mock_instance, '_fsm_context'):
            delattr(mock_instance, '_fsm_context')

        # Test has_fsm_context - no context
        result = FSMModelMixin.has_fsm_context(mock_instance)
        self.assertFalse(result)

        # Test has_fsm_context - with context
        mock_instance._fsm_context = {'test': 'data'}
        result = FSMModelMixin.has_fsm_context(mock_instance)
        self.assertTrue(result)

        # Test get_fsm_context
        context = FSMModelMixin.get_fsm_context(mock_instance)
        self.assertEqual(context, {'test': 'data'})

        # Test clear_fsm_context
        FSMModelMixin.clear_fsm_context(mock_instance)
        # Should have called delattr
        self.assertFalse(hasattr(mock_instance, '_fsm_context'))


@pytest.mark.django_db
class TestContextAwareIntegration(TestCase):
    """Integration tests for context-aware FSM."""

    def setUp(self):
        """Set up test fixtures."""
        self.user = User.objects.create_user(username='integration_user', email='integration@example.com')

    @patch('fsm.signals_utils.flag_set')
    @patch('fsm.integrations.task_created')
    def test_full_context_flow(self, mock_task_created, mock_flag_set):
        """Test full flow with context-aware signals."""
        from fsm.managers import create_api_context

        # Enable FSM processing
        mock_flag_set.return_value = True

        # Create context
        context = create_api_context(user=self.user, operation='integration_test', request_id='req-integration')

        # Create mock task with context and sender
        mock_sender = MagicMock()
        mock_sender.__name__ = 'Task'
        mock_task = MagicMock()
        mock_task._meta.label_lower = 'task'
        mock_task.pk = 1
        mock_task._fsm_context = context
        mock_task.project = MagicMock()

        # Import and call signal handler
        from fsm.signals import handle_model_state_transitions

        # This should process the signal since context is present
        handle_model_state_transitions(sender=mock_sender, instance=mock_task, created=True)

        # Verify FSM function was called
        mock_task_created.assert_called_once()

        # Verify it was called with the user from context
        call_args = mock_task_created.call_args
        self.assertEqual(call_args[1]['user'].id, self.user.id)
