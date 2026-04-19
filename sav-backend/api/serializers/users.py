from django.db import transaction
from rest_framework import serializers
from dj_rest_auth.registration.serializers import RegisterSerializer
from api.models import User, Account

class AccountSerializer(serializers.ModelSerializer):
    """Nested account serializer for user profile."""
    age = serializers.ReadOnlyField()

    class Meta:
        model = Account
        fields = ['id', 'user', 'display_name', 'account_type', 'role', 'date_of_birth', 'avatar_color', 'age']
        read_only_fields = ['user', 'created_at', 'updated_at']

class UserSerializer(serializers.ModelSerializer):
    """User serializer without family_id."""
    profile = AccountSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_of_birth', 'profile']
        read_only_fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_of_birth', 'profile']

class CustomRegisterSerializer(RegisterSerializer):
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    # Redefine password1 and password2 to be not required because we use password/confirm_password
    password1 = serializers.CharField(required=False, write_only=True)
    password2 = serializers.CharField(required=False, write_only=True)

    def validate(self, attrs):
        # Map our payload fields to what allauth expects before calling super().validate()
        if 'password' in attrs:
            attrs['password1'] = attrs.get('password')
        if 'confirm_password' in attrs:
            attrs['password2'] = attrs.get('confirm_password')
        return super().validate(attrs)

    def get_cleaned_data(self):
        cleaned_data = super().get_cleaned_data()
        cleaned_data['first_name'] = self.validated_data.get('first_name', '')
        cleaned_data['last_name'] = self.validated_data.get('last_name', '')
        return cleaned_data

    @transaction.atomic
    def save(self, request):
        user = super().save(request)
        user.first_name = self.validated_data.get('first_name', '')
        user.last_name = self.validated_data.get('last_name', '')
        user.save()

        # Create the profile (Account) if it doesn't exist
        # Note: dj-rest-auth might have already triggered some signals,
        # but we ensure the primary profile is set here.
        if not user.profile:
            account = Account.objects.create(
                user=user,
                display_name=f"{user.first_name} {user.last_name}".strip() or user.username,
                account_type='primary',
                role='owner'
            )
            user.profile = account
            user.save()
        
        return user
