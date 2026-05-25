# accounts/serializers.py

from rest_framework import serializers
from .models import User

class RegisterSerializer(serializers.ModelSerializer):
    # ModelSerializer automatically creates fields from the model
    # We just specify which fields to include

    password = serializers.CharField(
        write_only=True,   # password goes IN but never comes back OUT in responses
        min_length=8,      # validation rule
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role', 'company']
        # 'company' is optional — only needed if role is 'recruiter'

    def validate_role(self, value):
        # Custom validation for the role field
        # This runs automatically when serializer.is_valid() is called
        allowed = [User.RECRUITER, User.CANDIDATE]
        if value not in allowed:
            raise serializers.ValidationError(f"Role must be one of: {allowed}")
        return value

    def create(self, validated_data):
        # validated_data is a clean Python dict after validation passes
        # We can't just do User(**validated_data) because password needs hashing
        # create_user() handles password hashing automatically

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            role=validated_data.get('role', User.CANDIDATE),
            company=validated_data.get('company', ''),
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    # Used to return user info (e.g. for the /me/ endpoint)
    # Never include password here

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'company']
        # read_only by default since we're just reading user info