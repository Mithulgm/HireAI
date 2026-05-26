# jobs/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Job
from .serializers import JobSerializer


# ── Custom permission ─────────────────────────────────────────────────────────
# DRF lets us write our own permission rules
from rest_framework.permissions import BasePermission

class IsRecruiter(BasePermission):
    # This class is reusable — attach it to any view
    # has_permission runs on every request to that view
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == 'recruiter'
            # Only pass if logged in AND role is recruiter
        )


# ── Job List & Create ─────────────────────────────────────────────────────────
class JobListCreateView(APIView):

    def get_permissions(self):
        # get_permissions() lets us set DIFFERENT permissions per HTTP method
        # GET requests → anyone can view jobs (no login needed)
        # POST requests → only recruiters can post jobs
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsRecruiter()]

    def get(self, request):
        jobs = Job.objects.filter(is_active=True)
        # Only return active jobs
        # .filter() works exactly like in Stocket

        # Optional filtering by category or job_type via query params
        # e.g. /api/jobs/?category=engineering
        category = request.query_params.get('category')
        job_type = request.query_params.get('job_type')

        if category:
            jobs = jobs.filter(category=category)
        if job_type:
            jobs = jobs.filter(job_type=job_type)

        serializer = JobSerializer(jobs, many=True)
        # many=True → serialize a list of objects, not just one
        return Response(serializer.data)

    def post(self, request):
        serializer = JobSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(posted_by=request.user)
            # posted_by is NOT in the request body (client shouldn't set it)
            # We set it here from the logged-in user
            # serializer.save(**kwargs) passes extra fields to create()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── Single Job: Get, Edit, Delete ─────────────────────────────────────────────
class JobDetailView(APIView):

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsRecruiter()]

    def get_object(self, pk):
        # Helper method to fetch the job or return None
        try:
            return Job.objects.get(pk=pk)
        except Job.DoesNotExist:
            return None

    def get(self, request, pk):
        job = self.get_object(pk)
        if not job:
            return Response(
                {'error': 'Job not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = JobSerializer(job)
        return Response(serializer.data)

    def put(self, request, pk):
        job = self.get_object(pk)
        if not job:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

        # Make sure only the recruiter who posted the job can edit it
        if job.posted_by != request.user:
            return Response(
                {'error': 'You can only edit your own jobs'},
                status=status.HTTP_403_FORBIDDEN
                # 403 = "I know who you are, but you're not allowed"
                # Different from 401 = "I don't know who you are"
            )

        serializer = JobSerializer(job, data=request.data, partial=True)
        # partial=True → allow updating only some fields (not all required)
        # e.g. only update salary without resending title, description etc.

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        job = self.get_object(pk)
        if not job:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

        if job.posted_by != request.user:
            return Response(
                {'error': 'You can only delete your own jobs'},
                status=status.HTTP_403_FORBIDDEN
            )

        job.delete()
        return Response(
            {'message': 'Job deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
            # 204 = "Success, but nothing to return"
        )