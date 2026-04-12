from decimal import Decimal

MONTHLY_MULTIPLIERS = {
    'monthly': Decimal('1'),
    'quarterly': Decimal('1') / Decimal('3'),
    'annually': Decimal('1') / Decimal('12'),
    'one_off': Decimal('0'),
}

def to_monthly(amount: Decimal, frequency: str) -> Decimal:
    return amount * MONTHLY_MULTIPLIERS.get(frequency, Decimal('1'))
