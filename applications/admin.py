# applications/admin.py

from django.contrib import admin
from .models import Application

@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display  = ['candidate', 'job', 'ai_match_score', 'status', 'applied_at']
    list_filter   = ['status']
    search_fields = ['candidate__username', 'job__title']
    ordering      = ['-ai_match_score']