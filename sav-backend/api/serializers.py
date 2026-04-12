from rest_framework import serializers
from api.models import (
    CustomUser, Account, Asset, AssetOwnership,
    Liability, Income, Expense, Simulation, DistributionRule
)


# ── User ──────────────────────────────────────────────────────────────────────

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'family_id']
        read_only_fields = ['family_id']


# ── Account ───────────────────────────────────────────────────────────────────

class AccountSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()

    class Meta:
        model = Account
        fields = [
            'id', 'user', 'display_name', 'account_type', 'role',
            'date_of_birth', 'avatar_color', 'age', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


# ── Asset ─────────────────────────────────────────────────────────────────────

class AssetOwnershipSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.display_name', read_only=True)

    class Meta:
        model = AssetOwnership
        fields = ['id', 'account', 'account_name', 'ownership_percentage']


class AssetSerializer(serializers.ModelSerializer):
    ownerships = AssetOwnershipSerializer(many=True, read_only=True)
    gain_loss = serializers.SerializerMethodField()
    gain_loss_pct = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = [
            'id', 'name', 'asset_type', 'current_value', 'acquisition_value',
            'growth_rate', 'liquidity_score', 'notes', 'ownerships',
            'gain_loss', 'gain_loss_pct', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_gain_loss(self, obj):
        return float(obj.current_value - obj.acquisition_value)

    def get_gain_loss_pct(self, obj):
        if obj.acquisition_value and obj.acquisition_value != 0:
            return float((obj.current_value - obj.acquisition_value) / obj.acquisition_value * 100)
        return 0.0


class AssetWriteSerializer(serializers.ModelSerializer):
    """Simplified write serializer for creating/updating assets."""
    ownerships = AssetOwnershipSerializer(many=True, required=False)

    class Meta:
        model = Asset
        fields = [
            'id', 'name', 'asset_type', 'current_value', 'acquisition_value',
            'growth_rate', 'liquidity_score', 'notes', 'ownerships'
        ]

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


# ── Liability ─────────────────────────────────────────────────────────────────

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


# ── Income ────────────────────────────────────────────────────────────────────

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


# ── Expense ───────────────────────────────────────────────────────────────────

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


# ── Simulation ────────────────────────────────────────────────────────────────

class SimulationSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.display_name', read_only=True)

    class Meta:
        model = Simulation
        fields = [
            'id', 'account', 'account_name', 'name', 'simulation_type',
            'scenario_params', 'results', 'created_at', 'updated_at'
        ]
        read_only_fields = ['results', 'created_at', 'updated_at']


# ── Distribution Rule ─────────────────────────────────────────────────────────

class DistributionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DistributionRule
        fields = ['id', 'asset', 'beneficiary', 'percentage', 'unlock_age', 'condition_notes', 'created_at']
        read_only_fields = ['created_at']
