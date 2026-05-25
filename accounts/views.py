from django.shortcuts import render

# Create your views here.
# accounts/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]
    # Override the global "IsAuthenticated" rule from settings.py
    # Because obviously you can't be logged in to register

    def post(self, request):
        # request.data is the JSON body sent by the frontend
        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()
            # serializer.save() calls our create() method above

            # Generate JWT tokens for the new user immediately
            # So they're logged in right after registering
            refresh = RefreshToken.for_user(user)

            return Response({
                'user': UserSerializer(user).data,
                # UserSerializer(user).data converts user object → dict → JSON
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            }, status=status.HTTP_201_CREATED)
            # 201 = "Created" (more specific than 200 "OK")

        # If validation failed, return the errors
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        # 400 = "Bad Request" — the client sent invalid data


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    # Must be logged in — JWT token required in request header

    def get(self, request):
        # request.user is automatically set by JWT authentication
        # DRF reads the token from the header, decodes it, finds the user
        serializer = UserSerializer(request.user)
        return Response(serializer.data)