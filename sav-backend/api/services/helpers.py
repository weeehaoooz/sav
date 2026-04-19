from decimal import Decimal

MONTHLY_MULTIPLIERS = {
    'monthly': Decimal('1'),
    'quarterly': Decimal('1') / Decimal('3'),
    'annually': Decimal('1') / Decimal('12'),
    'one_off': Decimal('0'),
}

def to_monthly(amount: Decimal, frequency: str) -> Decimal:
    return amount * MONTHLY_MULTIPLIERS.get(frequency, Decimal('1'))

def calculate_cpf_contributions(monthly_salary: Decimal, age: int = 30):
    """
    Calculate employee and employer CPF contributions for 2026.
    OW Ceiling: $8,000.
    """
    if not monthly_salary:
        return Decimal('0'), Decimal('0')
    
    # Apply OW Ceiling
    subject_to_cpf = min(monthly_salary, Decimal('8000'))
    
    employee_rate, employer_rate = get_cpf_rates(age)
    
    employee_cpf = (subject_to_cpf * employee_rate).quantize(Decimal('1'), rounding='ROUND_HALF_UP')
    employer_cpf = (subject_to_cpf * employer_rate).quantize(Decimal('1'), rounding='ROUND_HALF_UP')
    
    return employee_cpf, employer_cpf

def calculate_bonus_cpf(bonus_amount: Decimal, age: int, annual_ow_subject_to_cpf: Decimal):
    """
    Calculate CPF for Additional Wages (Bonuses) for 2026.
    AW Ceiling: $102,000 - Total OW subject to CPF in the year.
    """
    if not bonus_amount:
        return Decimal('0'), Decimal('0')
        
    aw_ceiling = max(Decimal('0'), Decimal('102000') - annual_ow_subject_to_cpf)
    subject_to_cpf = min(bonus_amount, aw_ceiling)
    
    employee_rate, employer_rate = get_cpf_rates(age)
    
    employee_cpf = (subject_to_cpf * employee_rate).quantize(Decimal('1'), rounding='ROUND_HALF_UP')
    employer_cpf = (subject_to_cpf * employer_rate).quantize(Decimal('1'), rounding='ROUND_HALF_UP')
    
    return employee_cpf, employer_cpf

def get_cpf_rates(age: int):
    """
    Returns (employee_rate, employer_rate) based on age for 2026.
    """
    if age <= 55:
        return Decimal('0.20'), Decimal('0.17')
    elif age <= 60:
        return Decimal('0.18'), Decimal('0.16')
    elif age <= 65:
        return Decimal('0.125'), Decimal('0.125')
    elif age <= 70:
        return Decimal('0.075'), Decimal('0.09')
    else:
        return Decimal('0.05'), Decimal('0.075')
