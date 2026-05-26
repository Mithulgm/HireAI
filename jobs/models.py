# jobs/models.py

from django.db import models
from django.conf import settings
# settings.AUTH_USER_MODEL gives us our custom User model
# Always use this instead of importing User directly — it's best practice


class Job(models.Model):

    # ── Job Type choices ──────────────────────────────────────────────
    FULL_TIME = 'full_time'
    PART_TIME = 'part_time'
    CONTRACT  = 'contract'
    INTERNSHIP = 'internship'

    JOB_TYPE_CHOICES = [
        (FULL_TIME,  'Full Time'),
        (PART_TIME,  'Part Time'),
        (CONTRACT,   'Contract'),
        (INTERNSHIP, 'Internship'),
    ]

    # ── Category choices ──────────────────────────────────────────────
    ENGINEERING = 'engineering'
    DESIGN      = 'design'
    MARKETING   = 'marketing'
    AI_ML       = 'ai_ml'
    PRODUCT     = 'product'
    DATA        = 'data'
    OTHER       = 'other'

    CATEGORY_CHOICES = [
        (ENGINEERING, 'Engineering'),
        (DESIGN,      'Design'),
        (MARKETING,   'Marketing'),
        (AI_ML,       'AI / ML'),
        (PRODUCT,     'Product'),
        (DATA,        'Data'),
        (OTHER,       'Other'),
    ]

    # ── Fields ───────────────────────────────────────────────────────
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        # if the recruiter account is deleted, delete their jobs too
        related_name='jobs'
        # lets us do recruiter.jobs.all() from the user object
    )

    title       = models.CharField(max_length=200)
    company     = models.CharField(max_length=200)
    location    = models.CharField(max_length=200)
    job_type    = models.CharField(max_length=20, choices=JOB_TYPE_CHOICES, default=FULL_TIME)
    category    = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default=ENGINEERING)
    salary      = models.CharField(max_length=100, blank=True)
    # CharField for salary because it's usually a range like "$120k–$160k"

    description  = models.TextField()
    requirements = models.TextField()

    skills = models.JSONField(default=list)
    # Stores a Python list as JSON in the DB
    # e.g. ["React", "Node.js", "PostgreSQL"]
    # JSONField is available in Django 3.1+ with SQLite/PostgreSQL

    is_active = models.BooleanField(default=True)
    # lets recruiters close a job without deleting it

    created_at = models.DateTimeField(auto_now_add=True)
    # auto_now_add=True → set once when created, never changed

    updated_at = models.DateTimeField(auto_now=True)
    # auto_now=True → updated every time the record is saved

    class Meta:
        ordering = ['-created_at']
        # newest jobs appear first by default
        # the - means descending (just like Stocket's querysets)

    def __str__(self):
        return f"{self.title} at {self.company}"