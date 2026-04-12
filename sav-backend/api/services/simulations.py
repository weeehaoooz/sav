from datetime import date

def project_retirement(params: dict) -> dict:
    current_age = int(params.get('current_age', 35))
    retirement_age = int(params.get('retirement_age', 65))
    current_nw = float(params.get('current_net_worth', 0))
    monthly_savings = float(params.get('monthly_savings', 0))
    annual_return = float(params.get('annual_return', 0.07))
    inflation_rate = float(params.get('inflation_rate', 0.025))
    annual_expenses = float(params.get('annual_expenses', 60000))

    current_year = date.today().year
    years_to_retire = retirement_age - current_age
    total_years = years_to_retire + 30

    projections = []
    nw = current_nw
    target_nest_egg = annual_expenses * 25
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
            real_expenses = annual_expenses * ((1 + inflation_rate) ** year)
            nw = nw * (1 + annual_return) - real_expenses
        else:
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
