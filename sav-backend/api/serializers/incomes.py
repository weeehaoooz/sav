from rest_framework import serializers
from api.models import Income

class IncomeSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.display_name', read_only=True)
    monthly_equivalent = serializers.ReadOnlyField()

    class Meta:
        model = Income
        fields = [
            'id', 'account', 'account_name', 'name', 'income_type',
            'amount', 'frequency', 'growth_rate', 'volatility',
            'is_active', 'notes', 'monthly_equivalent', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
