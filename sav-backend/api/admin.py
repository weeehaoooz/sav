from django.contrib import admin
from api.models import (
    CustomUser, Account, Asset, AssetOwnership, AssetValuationHistory,
    Liability, Income, Expense, Simulation, DistributionRule
)


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'family_id', 'is_active']
    search_fields = ['username', 'email']


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'account_type', 'role', 'user', 'date_of_birth']
    list_filter = ['account_type', 'role']
    search_fields = ['display_name']


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ['name', 'asset_type', 'current_value', 'valuation_date']
    list_filter = ['asset_type']
    search_fields = ['name']


@admin.register(AssetValuationHistory)
class AssetValuationHistoryAdmin(admin.ModelAdmin):
    list_display = ['asset', 'valuation_date', 'current_value', 'created_at']
    list_filter = ['valuation_date']
    search_fields = ['asset__name']


@admin.register(AssetOwnership)
class AssetOwnershipAdmin(admin.ModelAdmin):
    list_display = ['asset', 'account', 'ownership_percentage']


@admin.register(Liability)
class LiabilityAdmin(admin.ModelAdmin):
    list_display = ['name', 'liability_type', 'outstanding_balance', 'interest_rate', 'owner']
    list_filter = ['liability_type']


@admin.register(Income)
class IncomeAdmin(admin.ModelAdmin):
    list_display = ['name', 'income_type', 'amount', 'frequency', 'account']
    list_filter = ['income_type', 'frequency']


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'amount', 'frequency', 'account']
    list_filter = ['category', 'frequency']


@admin.register(Simulation)
class SimulationAdmin(admin.ModelAdmin):
    list_display = ['name', 'simulation_type', 'account', 'created_at']
    list_filter = ['simulation_type']


@admin.register(DistributionRule)
class DistributionRuleAdmin(admin.ModelAdmin):
    list_display = ['asset', 'beneficiary', 'percentage', 'unlock_age']
