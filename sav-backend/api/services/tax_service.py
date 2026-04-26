from decimal import Decimal

# Singapore Personal Income Tax Brackets (YA 2024 onwards)
# Format: (up_to_amount, tax_rate_percent)
TAX_BRACKETS = [
    (20000, Decimal('0.00')),
    (30000, Decimal('0.02')),
    (40000, Decimal('0.035')),
    (80000, Decimal('0.07')),
    (120000, Decimal('0.115')),
    (160000, Decimal('0.15')),
    (200000, Decimal('0.18')),
    (240000, Decimal('0.19')),
    (280000, Decimal('0.195')),
    (320000, Decimal('0.20')),
    (500000, Decimal('0.22')),
    (1000000, Decimal('0.23')),
    (float('inf'), Decimal('0.24')),
]

MAX_PERSONAL_RELIEF_CAP = Decimal('80000.00')

def calculate_earned_income_relief(age: int) -> Decimal:
    """Calculate the base Earned Income Relief based on age."""
    if age < 55:
        return Decimal('1000.00')
    elif 55 <= age <= 59:
        return Decimal('6000.00')
    else:
        return Decimal('8000.00')

def calculate_tax(assessable_income: Decimal, reliefs: list[Decimal]) -> dict:
    """
    Calculates tax based on Singapore IRAS rules.
    assessable_income: Gross income minus allowable expenses
    reliefs: List of relief amounts (Earned Income, CPF, SRS, Dependent, etc.)
    """
    # 1. Total reliefs cannot exceed the cap
    total_reliefs = sum(reliefs)
    capped_reliefs = min(total_reliefs, MAX_PERSONAL_RELIEF_CAP)

    # 2. Chargeable Income
    chargeable_income = assessable_income - capped_reliefs
    if chargeable_income < 0:
        chargeable_income = Decimal('0.00')

    # 3. Calculate Tax Payable
    tax_payable = Decimal('0.00')
    previous_bracket_limit = Decimal('0.00')
    
    for limit, rate in TAX_BRACKETS:
        if chargeable_income <= previous_bracket_limit:
            break
            
        current_limit = Decimal(str(limit))
        taxable_amount_in_bracket = min(
            chargeable_income - previous_bracket_limit, 
            current_limit - previous_bracket_limit
        )
        tax_payable += taxable_amount_in_bracket * rate
        previous_bracket_limit = current_limit

    return {
        'assessable_income': float(assessable_income),
        'total_reliefs': float(total_reliefs),
        'capped_reliefs': float(capped_reliefs),
        'chargeable_income': float(chargeable_income),
        'tax_payable': float(tax_payable)
    }

def simulate_tax_savings(assessable_income: Decimal, base_reliefs: list[Decimal], additional_reliefs: list[Decimal]) -> dict:
    """Simulates the tax savings from adding additional reliefs (like SRS or CPF top-up)."""
    base_tax_result = calculate_tax(assessable_income, base_reliefs)
    
    new_reliefs = base_reliefs + additional_reliefs
    new_tax_result = calculate_tax(assessable_income, new_reliefs)
    
    tax_savings = base_tax_result['tax_payable'] - new_tax_result['tax_payable']
    
    return {
        'base': base_tax_result,
        'simulated': new_tax_result,
        'tax_savings': tax_savings
    }
