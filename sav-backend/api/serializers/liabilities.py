from rest_framework import serializers
from api.models import Liability

class LiabilitySerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.display_name', read_only=True)
    linked_asset_name = serializers.CharField(source='linked_asset.name', read_only=True, default=None)

    class Meta:
        model = Liability
        fields = [
            'id', 'owner', 'owner_name', 'name', 'liability_type',
            'principal', 'outstanding_balance', 'interest_rate',
            'tenure_months', 'payment_frequency', 'linked_asset',
            'linked_asset_name', 'start_date', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
