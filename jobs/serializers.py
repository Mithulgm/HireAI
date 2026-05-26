# jobs/serializers.py

from rest_framework import serializers
from .models import Job


class JobSerializer(serializers.ModelSerializer):

    posted_by_username = serializers.CharField(
        source='posted_by.username',
        read_only=True
        # source= tells DRF: "get this from posted_by.username on the model"
        # read_only=True → shown in responses but not required in requests
    )

    class Meta:
        model = Job
        fields = [
            'id',
            'title',
            'company',
            'location',
            'job_type',
            'category',
            'salary',
            'description',
            'requirements',
            'skills',
            'is_active',
            'created_at',
            'posted_by_username',
        ]
        read_only_fields = ['id', 'created_at', 'posted_by_username']
        # These fields are set by the server, not the client

    def validate_skills(self, value):
        # value is whatever the client sent for 'skills'
        # We make sure it's a list, not a string or something else
        if not isinstance(value, list):
            raise serializers.ValidationError("Skills must be a list.")
        return value