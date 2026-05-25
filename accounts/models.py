# accounts/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # AbstractUser already gives us: username, email, password, first_name, last_name
    # We're just ADDING two fields on top.

    RECRUITER = 'recruiter'
    CANDIDATE = 'candidate'

    ROLE_CHOICES = [
        (RECRUITER, 'Recruiter'),
        (CANDIDATE, 'Candidate'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=CANDIDATE
        # Every new user is a candidate unless they say otherwise
    )

    company = models.CharField(max_length=200, blank=True)
    # Only relevant for recruiters, but we store it on the same model.
    # blank=True means it's optional.

    def is_recruiter(self):
        return self.role == self.RECRUITER

    def is_candidate(self):
        return self.role == self.CANDIDATE

    def __str__(self):
        return f"{self.username} ({self.role})"