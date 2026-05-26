# jobs/admin.py

from django.contrib import admin
from .models import Job

@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display  = ['title', 'company', 'job_type', 'category', 'is_active', 'posted_by', 'created_at']
    list_filter   = ['job_type', 'category', 'is_active']
    search_fields = ['title', 'company']