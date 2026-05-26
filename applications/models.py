# applications/models.py

from django.db import models
from django.conf import settings
from jobs.models import Job


class Application(models.Model):

    # ── Status choices ────────────────────────────────────────────────
    UNDER_REVIEW = 'under_review'
    SHORTLISTED  = 'shortlisted'
    INTERVIEWED  = 'interviewed'
    OFFERED      = 'offered'
    REJECTED     = 'rejected'

    STATUS_CHOICES = [
        (UNDER_REVIEW, 'Under Review'),
        (SHORTLISTED,  'Shortlisted'),
        (INTERVIEWED,  'Interviewed'),
        (OFFERED,      'Offered'),
        (REJECTED,     'Rejected'),
    ]

    # ── Relationships ─────────────────────────────────────────────────
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='applications'
        # job.applications.all() gives all applications for a job
    )

    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='applications'
        # candidate.applications.all() gives all their applications
    )

    # ── Resume & AI fields ────────────────────────────────────────────
    resume_text = models.TextField()
    # Candidate pastes their resume as plain text

    cover_letter = models.TextField(blank=True)
    # Optional

    ai_match_score = models.IntegerField(default=0)
    # 0-100 score returned by Claude

    ai_matched_skills = models.JSONField(default=list)
    # ["Django", "Python"] — skills found in resume

    ai_missing_skills = models.JSONField(default=list)
    # ["PostgreSQL"] — skills NOT found in resume

    ai_summary = models.TextField(blank=True)
    # Claude's written assessment

    ai_strengths = models.JSONField(default=list)
    # ["Strong Python background", ...]

    ai_gaps = models.JSONField(default=list)
    # ["No cloud experience", ...]

    # ── Status & timestamps ───────────────────────────────────────────
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=UNDER_REVIEW
    )

    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-ai_match_score']
        # Best matches appear first — very useful for recruiters
        unique_together = ['job', 'candidate']
        # Prevents a candidate from applying to the same job twice

    def __str__(self):
        return f"{self.candidate.username} → {self.job.title} ({self.ai_match_score}%)"