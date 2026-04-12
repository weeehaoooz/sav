from rest_framework import serializers
from api.models import CustomUser

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'family_id']
        read_only_fields = ['family_id']
