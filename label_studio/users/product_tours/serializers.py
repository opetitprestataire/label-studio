from rest_framework import serializers
from .models import UserTour, TourInteractionData

class UserTourSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserTour
        fields = '__all__'
        
    def validate_interaction_data(self, value):
        try:
            # Validate interaction data using pydantic model
            TourInteractionData(**value)
            return value
        except Exception as e:
            raise serializers.ValidationError(f"Invalid interaction data format: {str(e)}")
