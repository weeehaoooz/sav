from decimal import Decimal
from .helpers import to_monthly

def calculate_net_worth(accounts):
    total_assets = Decimal('0')
    asset_by_type: dict[str, Decimal] = {}
    total_liabilities = Decimal('0')

    for account in accounts:
        for ownership in account.asset_ownerships.select_related('asset').all():
            asset = ownership.asset
            owned_value = asset.current_value * (ownership.ownership_percentage / Decimal('100'))
            total_assets += owned_value
            asset_by_type[asset.asset_type] = asset_by_type.get(asset.asset_type, Decimal('0')) + owned_value

        for liability in account.liabilities.all():
            total_liabilities += liability.outstanding_balance

    return {
        'total_assets': float(total_assets),
        'total_liabilities': float(total_liabilities),
        'net_worth': float(total_assets - total_liabilities),
        'asset_by_type': {k: float(v) for k, v in asset_by_type.items()},
    }

def calculate_cash_flow(accounts):
    monthly_income = Decimal('0')
    monthly_expenses = Decimal('0')
    income_by_type: dict[str, Decimal] = {}
    expense_by_category: dict[str, Decimal] = {}

    for account in accounts:
        for income in account.incomes.filter(is_active=True):
            val = to_monthly(income.amount, income.frequency)
            monthly_income += val
            income_by_type[income.income_type] = income_by_type.get(income.income_type, Decimal('0')) + val

        for expense in account.expenses.filter(is_active=True):
            val = to_monthly(expense.amount, expense.frequency)
            monthly_expenses += val
            expense_by_category[expense.category] = expense_by_category.get(expense.category, Decimal('0')) + val

    return {
        'monthly_income': float(monthly_income),
        'monthly_expenses': float(monthly_expenses),
        'monthly_cash_flow': float(monthly_income - monthly_expenses),
        'income_by_type': {k: float(v) for k, v in income_by_type.items()},
        'expense_by_category': {k: float(v) for k, v in expense_by_category.items()},
    }

def calculate_emergency_fund(accounts):
    liquid_assets = Decimal('0')
    monthly_expenses = Decimal('0')

    for account in accounts:
        for ownership in account.asset_ownerships.select_related('asset').all():
            asset = ownership.asset
            if asset.asset_type == 'bank':
                owned_value = asset.current_value * (ownership.ownership_percentage / Decimal('100'))
                liquid_assets += owned_value
        for expense in account.expenses.filter(is_active=True):
            monthly_expenses += to_monthly(expense.amount, expense.frequency)

    months_covered = float(liquid_assets / monthly_expenses) if monthly_expenses > 0 else 0
    return {
        'liquid_assets': float(liquid_assets),
        'monthly_expenses': float(monthly_expenses),
        'months_covered': round(months_covered, 1),
    }
