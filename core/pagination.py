# core/pagination.py

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class JobPagination(PageNumberPagination):
    page_size = 5
    # Default page size

    page_size_query_param = 'page_size'
    # Frontend can override with ?page_size=10

    max_page_size = 50
    # Can never request more than 50 at once

    def get_paginated_response(self, data):
        # Override default response format to include more useful info
        return Response({
            'count':    self.page.paginator.count,
            # Total number of jobs matching the filter

            'total_pages': self.page.paginator.num_pages,
            # How many pages exist in total

            'current_page': self.page.number,
            # Which page we're on right now

            'next':     self.get_next_link(),
            # URL to fetch next page (null if on last page)

            'previous': self.get_previous_link(),
            # URL to fetch previous page (null if on first page)

            'results':  data,
            # The actual list of jobs
        })