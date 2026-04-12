from rest_framework import serializers
from api.models import Account

class AccountSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()

    class Meta:
        model = Account
        fields = [
            'id', 'user', 'display_name', 'account_type', 'role',
            'date_of_birth', 'avatar_color', 'age', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
