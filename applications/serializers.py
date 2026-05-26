# applications/serializers.py

from rest_framework import serializers
from .models import Application


class ApplicationSerializer(serializers.ModelSerializer):

    # Read-only fields pulled from related models
    job_title        = serializers.CharField(source='job.title', read_only=True)
    job_company      = serializers.CharField(source='job.company', read_only=True)
    candidate_name   = serializers.CharField(source='candidate.username', read_only=True)

    class Meta:
        model = Application
        fields = [
            'id',
            'job',
            'job_title',
            'job_company',
            'candidate_name',
            'resume_text',
            'cover_letter',
            'ai_match_score',
            'ai_matched_skills',
            'ai_missing_skills',
            'ai_summary',
            'ai_strengths',
            'ai_gaps',
            'status',
            'applied_at',
        ]
        read_only_fields = [
            'id',
            'applied_at',
            'candidate_name',
            'job_title',
            'job_company',
            # AI fields are set by the server, not the client
            'ai_match_score',
            'ai_matched_skills',
            'ai_missing_skills',
            'ai_summary',
            'ai_strengths',
            'ai_gaps',
        ]


class ApplicationStatusSerializer(serializers.ModelSerializer):
    # Separate serializer just for recruiters updating status
    # Recruiter should ONLY be able to change status, nothing else

    class Meta:
        model = Application
        fields = ['id', 'status']