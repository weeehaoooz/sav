"""
Financial computation services for the SAV platform.
Pure Python functions — no Django imports required here.
"""
from decimal import Decimal
from datetime import date


# ── Frequency normalisation helpers ───────────────────────────────────────────

MONTHLY_MULTIPLIERS = {
    'monthly': Decimal('1'),
    'quarterly': Decimal('1') / Decimal('3'),
    'annually': Decimal('1') / Decimal('12'),
    'one_off': Decimal('0'),
}


def to_monthly(amount: Decimal, frequency: str) -> Decimal:
    return amount * MONTHLY_MULTIPLIERS.get(frequency, Decimal('1'))


# ── Net Worth ──────────────────────────────────────────────────────────────────

def calculate_net_worth(accounts):
    """
    Calculate total net worth across a queryset of accounts.
    Returns dict: total_assets, total_liabilities, net_worth, asset_by_type.
    """
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


# ── Cash Flow ──────────────────────────────────────────────────────────────────

def calculate_cash_flow(accounts):
    """
    Calculate monthly cash flow across a queryset of accounts.
    Returns dict: monthly_income, monthly_expenses, monthly_cash_flow, income_by_type.
    """
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


# ── Emergency Fund ─────────────────────────────────────────────────────────────

def calculate_emergency_fund(accounts):
    """Returns how many months of expenses are covered by liquid assets."""
    liquid_assets = Decimal('0')
    monthly_expenses = Decimal('0')

    for account in accounts:
        for ownership in account.asset_ownerships.select_related('asset').all():
            asset = ownership.asset
            if asset.asset_type in ('bank',) and asset.liquidity_score >= 8:
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


# ── Amortisation ───────────────────────────────────────────────────────────────

def generate_amortisation_schedule(liability) -> list[dict]:
    """Generate a period-by-period amortisation schedule for a liability."""
    principal = float(liability.outstanding_balance)
    annual_rate = float(liability.interest_rate)

    freq = liability.payment_frequency
    if freq == 'monthly':
        periods = liability.tenure_months
        period_rate = annual_rate / 12
    elif freq == 'quarterly':
        periods = liability.tenure_months // 3
        period_rate = annual_rate / 4
    else:  # annually
        periods = liability.tenure_months // 12
        period_rate = annual_rate

    if periods <= 0:
        return []

    if period_rate == 0:
        payment = principal / periods
    else:
        payment = principal * (period_rate * (1 + period_rate) ** periods) / ((1 + period_rate) ** periods - 1)

    schedule = []
    balance = principal

    for i in range(1, periods + 1):
        interest = balance * period_rate
        principal_part = payment - interest
        balance -= principal_part
        schedule.append({
            'period': i,
            'payment': round(payment, 2),
            'principal': round(principal_part, 2),
            'interest': round(interest, 2),
            'balance': round(max(balance, 0), 2),
        })

    return schedule


# ── Retirement Projection ──────────────────────────────────────────────────────

def project_retirement(params: dict) -> dict:
    """
    Generate a year-by-year retirement projection using deterministic model.

    Params expected:
        current_age, retirement_age, current_net_worth, monthly_savings,
        annual_return, inflation_rate, annual_expenses
    """
    current_age = int(params.get('current_age', 35))
    retirement_age = int(params.get('retirement_age', 65))
    current_nw = float(params.get('current_net_worth', 0))
    monthly_savings = float(params.get('monthly_savings', 0))
    annual_return = float(params.get('annual_return', 0.07))
    inflation_rate = float(params.get('inflation_rate', 0.025))
    annual_expenses = float(params.get('annual_expenses', 60000))

    current_year = date.today().year
    years_to_retire = retirement_age - current_age
    # Simulate up to 30 years post retirement
    total_years = years_to_retire + 30

    projections = []
    nw = current_nw
    target_nest_egg = annual_expenses * 25  # 4% safe withdrawal rule
    fire_age = None

    for year in range(total_years + 1):
        age = current_age + year
        is_retired = age >= retirement_age

        projections.append({
            'age': age,
            'year': current_year + year,
            'net_worth': round(nw, 2),
            'is_retired': is_retired,
        })

        if not fire_age and nw >= target_nest_egg:
            fire_age = age

        if is_retired:
            # Drawdown phase
            real_expenses = annual_expenses * ((1 + inflation_rate) ** year)
            nw = nw * (1 + annual_return) - real_expenses
        else:
            # Accumulation phase
            nw = nw * (1 + annual_return) + monthly_savings * 12

        if nw < 0:
            nw = 0

    final_nw = projections[years_to_retire]['net_worth'] if years_to_retire < len(projections) else 0
    readiness_score = min(100.0, (final_nw / target_nest_egg) * 100) if target_nest_egg > 0 else 0

    return {
        'projections': projections,
        'readiness_score': round(readiness_score, 1),
        'target_nest_egg': round(target_nest_egg, 2),
        'projected_at_retirement': round(final_nw, 2),
        'fire_age': fire_age,
        'years_to_fire': (fire_age - current_age) if fire_age else None,
    }
