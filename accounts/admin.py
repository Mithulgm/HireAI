# accounts/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

# UserAdmin gives us the full Django user admin panel (password hashing, permissions etc.)
# We're just extending it to also show our custom fields (role, company)

@admin.register(User)
class CustomUserAdmin(UserAdmin):

    # Columns shown in the user list page
    list_display = ['username', 'email', 'role', 'company', 'is_staff']

    # Filters on the right sidebar
    list_filter = ['role', 'is_staff']

    # Add our custom fields to the edit form
    fieldsets = UserAdmin.fieldsets + (
        ('HireAI Info', {
            'fields': ('role', 'company')
        }),
    )