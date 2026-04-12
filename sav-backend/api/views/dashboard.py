from rest_framework.views import APIView
from rest_framework.response import Response
from api.models import Account
from api.services.dashboard import calculate_net_worth, calculate_cash_flow, calculate_emergency_fund
from api.services.simulations import project_retirement

class DashboardSummaryView(APIView):
    def get(self, request):
        user_id = request.query_params.get('user_id')
        if user_id:
            accounts = Account.objects.filter(user_id=user_id).prefetch_related(
                'asset_ownerships__asset', 'liabilities', 'incomes', 'expenses'
            )
        else:
            accounts = Account.objects.all().prefetch_related(
                'asset_ownerships__asset', 'liabilities', 'incomes', 'expenses'
            )

        nw = calculate_net_worth(accounts)
        cf = calculate_cash_flow(accounts)
        ef = calculate_emergency_fund(accounts)

        monthly_savings = cf['monthly_cash_flow']
        readiness_params = {
            'current_age': 35,
            'retirement_age': 65,
            'current_net_worth': nw['net_worth'],
            'monthly_savings': max(monthly_savings, 0),
            'annual_return': 0.07,
            'inflation_rate': 0.025,
            'annual_expenses': cf['monthly_expenses'] * 12,
        }
        retirement = project_retirement(readiness_params)

        return Response({
            'net_worth': nw,
            'cash_flow': cf,
            'emergency_fund': ef,
            'retirement_readiness': retirement['readiness_score'],
            'fire_age': retirement['fire_age'],
        })
