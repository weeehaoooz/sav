from rest_framework import serializers
from api.models import Income

class IncomeSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.display_name', read_only=True)
    monthly_equivalent = serializers.ReadOnlyField()
    dob = serializers.DateField(allow_null=True)
    take_home_amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    additional_contributions = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model = Income
        fields = [
            'id', 'account', 'account_name', 'name', 'company', 'income_type', 'has_cpf',
            'amount', 'frequency', 'is_active', 'notes', 'monthly_equivalent', 'dob',
            'take_home_amount', 'additional_contributions', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'take_home_amount', 'additional_contributions']
