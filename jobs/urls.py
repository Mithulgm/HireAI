# jobs/urls.py

from django.urls import path
from .views import JobListCreateView, JobDetailView

urlpatterns = [
    path('', JobListCreateView.as_view(), name='job-list-create'),
    # /api/jobs/         → GET (list) or POST (create)

    path('<int:pk>/', JobDetailView.as_view(), name='job-detail'),
    # /api/jobs/1/       → GET, PUT, DELETE for job with id=1
    # <int:pk> captures the number from the URL and passes it to the view
]