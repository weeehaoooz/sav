from rest_framework import serializers
from api.models import Expense

class ExpenseSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.display_name', read_only=True)
    monthly_equivalent = serializers.ReadOnlyField()

    class Meta:
        model = Expense
        fields = [
            'id', 'account', 'account_name', 'shared_with', 'name', 'category',
            'amount', 'frequency', 'inflation_rate', 'is_active', 'notes',
            'monthly_equivalent', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
