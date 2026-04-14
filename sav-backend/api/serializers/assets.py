from rest_framework import serializers
from api.models import Asset, AssetOwnership, AssetValuationHistory, DistributionRule

class AssetOwnershipSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.display_name', read_only=True)

    class Meta:
        model = AssetOwnership
        fields = ['id', 'account', 'account_name', 'ownership_percentage']

class AssetValuationHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetValuationHistory
        fields = [
            'id', 'asset', 'valuation_date', 'current_value', 'acquisition_value',
            'cpf_oa', 'cpf_sa', 'cpf_ma', 'cpf_ra', 'created_at'
        ]

from django.utils import timezone

class AssetSerializer(serializers.ModelSerializer):
    ownerships = AssetOwnershipSerializer(many=True, read_only=True)
    ytd_gain_loss = serializers.SerializerMethodField()
    ytd_gain_loss_pct = serializers.SerializerMethodField()
    gain_loss = serializers.SerializerMethodField()
    gain_loss_pct = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = [
            'id', 'name', 'asset_type', 'current_value', 'acquisition_value',
            'currency', 'valuation_date', 'ownerships',
            'cpf_oa', 'cpf_sa', 'cpf_ma', 'cpf_ra',
            'ytd_gain_loss', 'ytd_gain_loss_pct', 'gain_loss', 'gain_loss_pct', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_base_record_for_ytd(self, obj):
        current_year = timezone.now().year
        # Query DB directly to bypass prefetch cache and ensure we see new entries
        all_history = AssetValuationHistory.objects.filter(asset=obj).order_by('valuation_date', 'created_at')
        
        history_list = list(all_history)
        
        # 1. Try to find the latest valuation of the previous year (Closing value)
        previous_year_entries = [h for h in history_list if h.valuation_date.year < current_year]
        if previous_year_entries:
            # They are already ordered by date ascending, so the last one is the latest of the previous years
            return previous_year_entries[-1]

        # 2. Fallback to the earliest valuation of the current year
        this_year_entries = [h for h in history_list if h.valuation_date.year == current_year]
        if this_year_entries:
            return this_year_entries[0]

        # 3. Fallback to a mock object with acquisition value as base
        return None

    def get_ytd_gain_loss(self, obj):
        base_record = self.get_base_record_for_ytd(obj)
        
        # Determine base value and base acquisition cost
        if base_record and base_record.valuation_date < obj.valuation_date:
            base_value = float(base_record.current_value)
            base_acq = float(base_record.acquisition_value)
        else:
            # Fallback for new assets or assets with only one valuation today:
            # Compare current state to the initial acquisition cost.
            base_value = float(obj.acquisition_value)
            base_acq = float(obj.acquisition_value)

        # Formula: (Current Value - Base Value) - (Current Acquisition - Base Acquisition)
        value_change = float(obj.current_value) - base_value
        acq_change = float(obj.acquisition_value) - base_acq
        return value_change - acq_change

    def get_ytd_gain_loss_pct(self, obj):
        base_record = self.get_base_record_for_ytd(obj)
        
        if base_record and base_record.valuation_date < obj.valuation_date:
            base_value = float(base_record.current_value)
        else:
            base_value = float(obj.acquisition_value)

        gain_loss = self.get_ytd_gain_loss(obj)
        denominator = base_value
        if denominator != 0:
            return (gain_loss / denominator) * 100
        return 0.0

    def get_gain_loss(self, obj):
        return float(obj.current_value - obj.acquisition_value)

    def get_gain_loss_pct(self, obj):
        if obj.acquisition_value and obj.acquisition_value != 0:
            return float((obj.current_value - obj.acquisition_value) / obj.acquisition_value * 100)
        return 0.0

class AssetWriteSerializer(serializers.ModelSerializer):
    """Simplified write serializer for creating/updating assets."""
    ownerships = AssetOwnershipSerializer(many=True, required=False)
    
    acquisition_value = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    cpf_oa = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    cpf_sa = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    cpf_ma = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    cpf_ra = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)

    class Meta:
        model = Asset
        fields = [
            'id', 'name', 'asset_type', 'current_value', 'acquisition_value',
            'currency', 'valuation_date', 'ownerships',
            'cpf_oa', 'cpf_sa', 'cpf_ma', 'cpf_ra'
        ]

    def to_internal_value(self, data):
        decimal_fields = ['acquisition_value', 'cpf_oa', 'cpf_sa', 'cpf_ma', 'cpf_ra']
        for field in decimal_fields:
            if field in data and data[field] is None:
                data[field] = 0
        return super().to_internal_value(data)

    def create(self, validated_data):
        ownerships_data = validated_data.pop('ownerships', [])
        asset = Asset.objects.create(**validated_data)
        for ownership in ownerships_data:
            AssetOwnership.objects.create(asset=asset, **ownership)
        return asset

    def update(self, instance, validated_data):
        ownerships_data = validated_data.pop('ownerships', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if ownerships_data is not None:
            instance.ownerships.all().delete()
            for ownership in ownerships_data:
                AssetOwnership.objects.create(asset=instance, **ownership)
        return instance

class DistributionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DistributionRule
        fields = ['id', 'asset', 'beneficiary', 'percentage', 'unlock_age', 'condition_notes', 'created_at']
        read_only_fields = ['created_at']
