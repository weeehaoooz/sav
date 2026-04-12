def generate_amortisation_schedule(liability) -> list[dict]:
    principal = float(liability.outstanding_balance)
    annual_rate = float(liability.interest_rate)

    freq = liability.payment_frequency
    if freq == 'monthly':
        periods = liability.tenure_months
        period_rate = annual_rate / 12
    elif freq == 'quarterly':
        periods = liability.tenure_months // 3
        period_rate = annual_rate / 4
    else:
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
