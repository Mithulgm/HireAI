# applications/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import Application
from .serializers import ApplicationSerializer, ApplicationStatusSerializer
from .ai import analyze_resume
from jobs.models import Job


class ApplicationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == 'recruiter':
            # Recruiter sees applications for ALL their jobs
            applications = Application.objects.filter(
                job__posted_by=user
                # job__posted_by is a lookup across the FK relationship
                # "give me applications where the job's posted_by = this user"
                # Double underscore __ means "follow the foreign key"
            )
        else:
            # Candidate sees only their own applications
            applications = Application.objects.filter(candidate=user)

        serializer = ApplicationSerializer(applications, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Only candidates can apply
        if request.user.role != 'candidate':
            return Response(
                {'error': 'Only candidates can apply for jobs'},
                status=status.HTTP_403_FORBIDDEN
            )

        job_id = request.data.get('job')
        # Get the job_id from request body

        # Check the job exists
        try:
            job = Job.objects.get(pk=job_id, is_active=True)
        except Job.DoesNotExist:
            return Response(
                {'error': 'Job not found or no longer active'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check candidate hasn't already applied
        if Application.objects.filter(job=job, candidate=request.user).exists():
            return Response(
                {'error': 'You have already applied for this job'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate the rest of the data
        serializer = ApplicationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # ── AI Analysis ───────────────────────────────────────────────
        resume_text = request.data.get('resume_text', '')
        try:
            ai_result = analyze_resume(resume_text, job)
            # ai_result is a Python dict from our ai.py function
        except Exception as e:
            print("AI ERROR →", type(e).__name__, str(e))  # ← add this
            ai_result = {
                'match_score': 0,
                'matched_skills': [],
                'missing_skills': job.skills,
                'summary': 'AI analysis unavailable.',
                'strengths': [],
                'gaps': []
            }

        # Save application with AI results
        application = serializer.save(
            candidate=request.user,
            job=job,
            ai_match_score=ai_result.get('match_score', 0),
            ai_matched_skills=ai_result.get('matched_skills', []),
            ai_missing_skills=ai_result.get('missing_skills', []),
            ai_summary=ai_result.get('summary', ''),
            ai_strengths=ai_result.get('strengths', []),
            ai_gaps=ai_result.get('gaps', []),
        )

        return Response(
            ApplicationSerializer(application).data,
            status=status.HTTP_201_CREATED
        )


class ApplicationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            app = Application.objects.get(pk=pk)
        except Application.DoesNotExist:
            return None

        # Candidate can only see their own application
        # Recruiter can only see applications for their jobs
        if user.role == 'candidate' and app.candidate != user:
            return None
        if user.role == 'recruiter' and app.job.posted_by != user:
            return None

        return app

    def get(self, request, pk):
        app = self.get_object(pk, request.user)
        if not app:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ApplicationSerializer(app).data)

    def put(self, request, pk):
        # Only recruiters can update application status
        if request.user.role != 'recruiter':
            return Response({'error': 'Only recruiters can update status'}, status=status.HTTP_403_FORBIDDEN)

        app = self.get_object(pk, request.user)
        if not app:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ApplicationStatusSerializer(app, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(ApplicationSerializer(app).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)