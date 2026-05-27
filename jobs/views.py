# jobs/views.py

from django.db.models import Q, Count
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission

from .models import Job
from .serializers import JobSerializer
from core.pagination import JobPagination
# Import your custom pagination class


class IsRecruiter(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == 'recruiter'
        )


class JobListCreateView(APIView):

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsRecruiter()]

    def get(self, request):
        jobs = Job.objects.filter(is_active=True).annotate(
            application_count=Count('applications')
        )

        # ── Search ────────────────────────────────────────────────
        search = request.query_params.get('search', '').strip()
        if search:
            jobs = jobs.filter(
                Q(title__icontains=search) |
                Q(company__icontains=search) |
                Q(description__icontains=search) |
                Q(location__icontains=search)
            )

        # ── Filters ───────────────────────────────────────────────
        category = request.query_params.get('category', '').strip()
        if category:
            jobs = jobs.filter(category=category)

        job_type = request.query_params.get('job_type', '').strip()
        if job_type:
            jobs = jobs.filter(job_type=job_type)

        # ── Ordering ──────────────────────────────────────────────
        ordering = request.query_params.get('ordering', '-created_at')
        allowed_orderings = [
            'created_at', '-created_at',
            'title', '-title',
            'application_count', '-application_count'
        ]
        if ordering in allowed_orderings:
            jobs = jobs.order_by(ordering)

        # ── Pagination ────────────────────────────────────────────
        paginator = JobPagination()
        page = paginator.paginate_queryset(jobs, request)
        # paginate_queryset slices the queryset to the right page
        # e.g. page 2 with page_size 5 → jobs[5:10]

        if page is not None:
            serializer = JobSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
            # Returns our custom paginated response format

        # Fallback if pagination is somehow disabled
        serializer = JobSerializer(jobs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = JobSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(posted_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)