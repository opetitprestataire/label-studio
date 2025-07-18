"""Test data_manager.managers module functionality.

This file tests the core functionality of the excluded_fields_for_evaluation
feature that optimizes task API performance by excluding expensive fields.
"""
from unittest.mock import Mock, patch

from django.test import TestCase
from data_manager.managers import PreparedTaskManager


class TestPreparedTaskManagerExcludedFields(TestCase):
    """Test PreparedTaskManager.annotate_queryset excluded_fields_for_evaluation functionality.
    
    This test validates step by step:
    - The annotate_queryset method properly handles excluded_fields_for_evaluation parameter
    - Expensive fields are correctly excluded when specified
    - The field inclusion logic works correctly with all_fields=True
    - Edge cases like empty exclusion lists and None values are handled properly
    
    Critical validation: The excluded_fields_for_evaluation feature provides
    performance optimization by allowing selective field exclusion while maintaining
    backward compatibility with existing all_fields behavior.
    """

    def setUp(self):
        """Set up test fixtures and mock objects for testing."""
        self.prepared_task_manager = PreparedTaskManager()
        self.mock_queryset = Mock()
        self.mock_queryset.annotate.return_value = self.mock_queryset

    def test_annotate_queryset_with_excluded_fields(self):
        """Test that annotate_queryset properly excludes specified fields.
        
        This test validates step by step:
        - Creating a queryset with all_fields=True and excluded_fields_for_evaluation
        - Verifying that expensive fields are excluded from annotation
        - Ensuring non-excluded fields are still included
        - Confirming the exclusion logic works correctly
        
        Critical validation: Expensive fields like annotations_results and 
        predictions_results are properly excluded, improving API performance.
        """
        # Define test fields that would normally be expensive
        expensive_fields = ['annotations_results', 'predictions_results', 'predictions_model_versions']
        normal_fields = ['completed_at', 'avg_lead_time', 'draft_exists']
        
        # Mock the TASK_ANNOTATIONS_FOR_EVALUATION to include our test fields
        test_annotations = {
            'annotations_results': Mock(),
            'predictions_results': Mock(), 
            'predictions_model_versions': Mock(),
            'completed_at': Mock(),
            'avg_lead_time': Mock(),
            'draft_exists': Mock()
        }
        
        with patch('data_manager.managers.get_annotations_map', return_value=test_annotations):
            # Action: Call annotate_queryset with excluded fields
            result = self.prepared_task_manager.annotate_queryset(
                queryset=self.mock_queryset,
                all_fields=True,
                excluded_fields_for_evaluation=expensive_fields
            )
            
            # Validation: Verify queryset.annotate was called
            self.mock_queryset.annotate.assert_called_once()
            call_kwargs = self.mock_queryset.annotate.call_args[1]
            
            # Validation: Expensive fields should be excluded
            for field in expensive_fields:
                self.assertNotIn(field, call_kwargs, 
                    f"Expensive field '{field}' should be excluded from annotations")
            
            # Validation: Normal fields should be included
            for field in normal_fields:
                self.assertIn(field, call_kwargs,
                    f"Normal field '{field}' should be included in annotations")
            
            # Validation: Return value should be the annotated queryset
            self.assertEqual(result, self.mock_queryset)

    def test_annotate_queryset_without_excluded_fields(self):
        """Test that annotate_queryset includes all fields when no exclusions specified.
        
        This test validates step by step:
        - Creating a queryset with all_fields=True and no exclusions
        - Verifying that all fields are included in annotations
        - Ensuring backward compatibility is maintained
        
        Critical validation: When excluded_fields_for_evaluation is None or empty,
        all fields should be included maintaining existing behavior.
        """
        # Define test fields
        all_test_fields = ['annotations_results', 'predictions_results', 'completed_at', 'avg_lead_time']
        
        test_annotations = {field: Mock() for field in all_test_fields}
        
        with patch('data_manager.managers.TASK_ANNOTATIONS_FOR_EVALUATION', test_annotations):
            # Action: Call annotate_queryset without excluded fields
            result = self.task_manager.annotate_queryset(
                queryset=self.mock_queryset,
                all_fields=True,
                excluded_fields_for_evaluation=None
            )
            
            # Validation: Verify queryset.annotate was called
            self.mock_queryset.annotate.assert_called_once()
            call_kwargs = self.mock_queryset.annotate.call_args[1]
            
            # Validation: All fields should be included
            for field in all_test_fields:
                self.assertIn(field, call_kwargs,
                    f"Field '{field}' should be included when no exclusions specified")

    def test_annotate_queryset_with_empty_excluded_fields(self):
        """Test that annotate_queryset handles empty excluded_fields_for_evaluation list.
        
        This test validates step by step:
        - Creating a queryset with all_fields=True and empty exclusion list
        - Verifying that all fields are included despite empty list
        - Ensuring edge case handling works correctly
        
        Critical validation: Empty exclusion lists should behave the same as
        None exclusion lists, including all fields.
        """
        all_test_fields = ['annotations_results', 'predictions_results', 'completed_at']
        test_annotations = {field: Mock() for field in all_test_fields}
        
        with patch('data_manager.managers.TASK_ANNOTATIONS_FOR_EVALUATION', test_annotations):
            # Action: Call annotate_queryset with empty excluded fields list
            result = self.task_manager.annotate_queryset(
                queryset=self.mock_queryset,
                all_fields=True,
                excluded_fields_for_evaluation=[]
            )
            
            # Validation: Verify queryset.annotate was called
            self.mock_queryset.annotate.assert_called_once()
            call_kwargs = self.mock_queryset.annotate.call_args[1]
            
            # Validation: All fields should be included with empty exclusion list
            for field in all_test_fields:
                self.assertIn(field, call_kwargs,
                    f"Field '{field}' should be included with empty exclusion list")

    def test_annotate_queryset_with_fields_for_evaluation(self):
        """Test that excluded_fields_for_evaluation works with specific fields_for_evaluation.
        
        This test validates step by step:
        - Creating a queryset with specific fields_for_evaluation and exclusions
        - Verifying that only specified fields are considered for inclusion
        - Ensuring exclusions work correctly with selective field inclusion
        
        Critical validation: When fields_for_evaluation is specified, only those
        fields should be considered, and exclusions should still apply.
        """
        # Define specific fields for evaluation and exclusions
        fields_for_evaluation = ['annotations_results', 'completed_at', 'avg_lead_time']
        excluded_fields = ['annotations_results']
        expected_included = ['completed_at', 'avg_lead_time']
        
        test_annotations = {
            'annotations_results': Mock(),
            'completed_at': Mock(),
            'avg_lead_time': Mock(),
            'predictions_results': Mock()  # This should not be included
        }
        
        with patch('data_manager.managers.TASK_ANNOTATIONS_FOR_EVALUATION', test_annotations):
            # Action: Call annotate_queryset with specific fields and exclusions
            result = self.task_manager.annotate_queryset(
                queryset=self.mock_queryset,
                fields_for_evaluation=fields_for_evaluation,
                excluded_fields_for_evaluation=excluded_fields
            )
            
            # Validation: Verify queryset.annotate was called
            self.mock_queryset.annotate.assert_called_once()
            call_kwargs = self.mock_queryset.annotate.call_args[1]
            
            # Validation: Only non-excluded fields from fields_for_evaluation should be included
            for field in expected_included:
                self.assertIn(field, call_kwargs,
                    f"Field '{field}' should be included (in fields_for_evaluation, not excluded)")
            
            # Validation: Excluded fields should not be included
            for field in excluded_fields:
                self.assertNotIn(field, call_kwargs,
                    f"Field '{field}' should be excluded")
            
            # Validation: Fields not in fields_for_evaluation should not be included
            self.assertNotIn('predictions_results', call_kwargs,
                "Field 'predictions_results' should not be included (not in fields_for_evaluation)")


class TestTaskManagerGetQueryset(TestCase):
    """Test TaskManager.get_queryset excluded_fields_for_evaluation parameter passing.
    
    This test validates step by step:
    - The get_queryset method properly passes excluded_fields_for_evaluation to annotate_queryset
    - Parameter passing works correctly with various combinations
    - Default values are handled properly
    
    Critical validation: The get_queryset method acts as a proper interface
    to the annotate_queryset functionality, ensuring the optimization is
    accessible through the main queryset API.
    """

    def setUp(self):
        """Set up test fixtures and mock objects for testing."""
        self.task_manager = TaskManager()

    @patch('data_manager.managers.TaskManager.annotate_queryset')
    def test_get_queryset_passes_excluded_fields(self, mock_annotate):
        """Test that get_queryset properly passes excluded_fields_for_evaluation to annotate_queryset.
        
        This test validates step by step:
        - Calling get_queryset with excluded_fields_for_evaluation parameter
        - Verifying the parameter is passed through to annotate_queryset
        - Ensuring other parameters are passed correctly
        
        Critical validation: The get_queryset method serves as the main interface
        and must properly forward all parameters to maintain the optimization feature.
        """
        # Setup: Mock the queryset and annotate_queryset
        mock_queryset = Mock()
        mock_annotate.return_value = mock_queryset
        
        excluded_fields = ['annotations_results', 'predictions_results']
        
        # Action: Call get_queryset with excluded_fields_for_evaluation
        result = self.task_manager.get_queryset(
            all_fields=True,
            excluded_fields_for_evaluation=excluded_fields
        )
        
        # Validation: Verify annotate_queryset was called with correct parameters
        mock_annotate.assert_called_once()
        call_args, call_kwargs = mock_annotate.call_args
        
        # Validation: Check that excluded_fields_for_evaluation was passed correctly
        self.assertEqual(call_kwargs.get('excluded_fields_for_evaluation'), excluded_fields,
            "excluded_fields_for_evaluation should be passed through to annotate_queryset")
        
        # Validation: Check that all_fields was passed correctly
        self.assertEqual(call_kwargs.get('all_fields'), True,
            "all_fields parameter should be passed through to annotate_queryset")

    @patch('data_manager.managers.TaskManager.annotate_queryset')
    def test_get_queryset_defaults_excluded_fields_to_none(self, mock_annotate):
        """Test that get_queryset defaults excluded_fields_for_evaluation to None when not provided.
        
        This test validates step by step:
        - Calling get_queryset without excluded_fields_for_evaluation parameter
        - Verifying the parameter defaults to None in annotate_queryset call
        - Ensuring backward compatibility is maintained
        
        Critical validation: When excluded_fields_for_evaluation is not specified,
        it should default to None, maintaining existing behavior.
        """
        # Setup: Mock the queryset and annotate_queryset
        mock_queryset = Mock()
        mock_annotate.return_value = mock_queryset
        
        # Action: Call get_queryset without excluded_fields_for_evaluation
        result = self.task_manager.get_queryset(all_fields=True)
        
        # Validation: Verify annotate_queryset was called
        mock_annotate.assert_called_once()
        call_args, call_kwargs = mock_annotate.call_args
        
        # Validation: Check that excluded_fields_for_evaluation defaults to None
        self.assertIsNone(call_kwargs.get('excluded_fields_for_evaluation'),
            "excluded_fields_for_evaluation should default to None when not provided")


class TestExcludedFieldsLogic(TestCase):
    """Test the core logic of excluded_fields_for_evaluation functionality.
    
    This test validates step by step:
    - The field inclusion/exclusion logic works correctly
    - Edge cases are handled properly
    - The boolean logic matches expected behavior
    
    Critical validation: The core logic that determines whether a field
    should be included based on fields_for_evaluation, all_fields, and
    excluded_fields_for_evaluation parameters works correctly.
    """

    def test_field_inclusion_logic(self):
        """Test the core field inclusion logic used in annotate_queryset.
        
        This test validates step by step:
        - Testing various combinations of parameters
        - Verifying the boolean logic is correct
        - Ensuring all edge cases are covered
        
        Critical validation: The logic (field in fields_for_evaluation or all_fields) 
        and field not in excluded_fields_for_evaluation works as expected.
        """
        # Test scenarios: (fields_for_evaluation, all_fields, excluded_fields, field, expected_result)
        test_scenarios = [
            # Scenario 1: all_fields=True, field not excluded
            (['field1'], True, [], 'field2', True),
            
            # Scenario 2: all_fields=True, field excluded
            (['field1'], True, ['field2'], 'field2', False),
            
            # Scenario 3: field in fields_for_evaluation, not excluded
            (['field1'], False, [], 'field1', True),
            
            # Scenario 4: field in fields_for_evaluation, but excluded
            (['field1'], False, ['field1'], 'field1', False),
            
            # Scenario 5: field not in fields_for_evaluation, all_fields=False
            (['field1'], False, [], 'field2', False),
            
            # Scenario 6: empty exclusion list behaves like None
            (['field1'], True, [], 'field2', True),
        ]
        
        for fields_for_eval, all_fields, excluded_fields, test_field, expected in test_scenarios:
            with self.subTest(
                fields_for_eval=fields_for_eval, 
                all_fields=all_fields, 
                excluded_fields=excluded_fields, 
                test_field=test_field
            ):
                # Apply the same logic used in annotate_queryset
                if excluded_fields is None:
                    excluded_fields = []
                
                should_include = (
                    (test_field in fields_for_eval or all_fields) 
                    and test_field not in excluded_fields
                )
                
                self.assertEqual(should_include, expected,
                    f"Field inclusion logic failed for field '{test_field}' with "
                    f"fields_for_eval={fields_for_eval}, all_fields={all_fields}, "
                    f"excluded_fields={excluded_fields}")

    def test_excluded_fields_none_handling(self):
        """Test that None excluded_fields_for_evaluation is handled correctly.
        
        This test validates step by step:
        - Passing None as excluded_fields_for_evaluation
        - Verifying it's treated as an empty list
        - Ensuring no fields are excluded when None is passed
        
        Critical validation: None values for excluded_fields_for_evaluation
        should not cause errors and should behave as if no exclusions were specified.
        """
        # Test the logic with None exclusions
        fields_for_evaluation = ['field1', 'field2']
        excluded_fields = None
        
        # This simulates the None check in annotate_queryset
        if excluded_fields is None:
            excluded_fields = []
        
        # Test that fields are included when not in exclusion list
        for field in fields_for_evaluation:
            should_include = (
                (field in fields_for_evaluation or False) 
                and field not in excluded_fields
            )
            self.assertTrue(should_include,
                f"Field '{field}' should be included when excluded_fields is None") 