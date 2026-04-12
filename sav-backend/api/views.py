from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import (
    CustomUser, Account, Asset, AssetOwnership, AssetValuationHistory,
    Liability, Income, Expense, Simulation, DistributionRule
)
from api.serializers import (
    CustomUserSerializer, AccountSerializer,
    AssetSerializer, AssetWriteSerializer, AssetOwnershipSerializer,
    AssetValuationHistorySerializer,
    LiabilitySerializer, IncomeSerializer, ExpenseSerializer,
    SimulationSerializer, DistributionRuleSerializer
)
from api import services


# ── Users ─────────────────────────────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer


class ProfileView(APIView):
    """Retrieve or update the authenticated user's profile."""
    def get(self, request):
        serializer = CustomUserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = CustomUserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── Accounts ──────────────────────────────────────────────────────────────────

class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.select_related('user').all()
    serializer_class = AccountSerializer


# ── Assets ────────────────────────────────────────────────────────────────────

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.prefetch_related('ownerships__account').all()

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return AssetWriteSerializer
        return AssetSerializer

    @action(detail=True, methods=['get'], url_path='distribution-rules')
    def distribution_rules(self, request, pk=None):
        asset = self.get_object()
        rules = DistributionRule.objects.filter(asset=asset)
        serializer = DistributionRuleSerializer(rules, many=True)
        return Response(serializer.data)


    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        asset = self.get_object()
        history = asset.valuation_history.all()
        serializer = AssetValuationHistorySerializer(history, many=True)
        return Response(serializer.data)


class AssetValuationHistoryViewSet(viewsets.ModelViewSet):
    queryset = AssetValuationHistory.objects.all()
    serializer_class = AssetValuationHistorySerializer

    def destroy(self, request, *args, **kwargs):
        history_item = self.get_object()
        asset = history_item.asset
        response = super().destroy(request, *args, **kwargs)
        # After deletion, refresh the asset from the remaining history
        asset.refresh_from_history()
        return response


# ── Liabilities ───────────────────────────────────────────────────────────────

class LiabilityViewSet(viewsets.ModelViewSet):
    queryset = Liability.objects.select_related('owner', 'linked_asset').all()
    serializer_class = LiabilitySerializer

    @action(detail=True, methods=['get'], url_path='amortisation')
    def amortisation(self, request, pk=None):
        liability = self.get_object()
        schedule = services.generate_amortisation_schedule(liability)
        return Response({'schedule': schedule, 'total_periods': len(schedule)})


# ── Income ────────────────────────────────────────────────────────────────────

class IncomeViewSet(viewsets.ModelViewSet):
    queryset = Income.objects.select_related('account').all()
    serializer_class = IncomeSerializer


# ── Expenses ──────────────────────────────────────────────────────────────────

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('account').prefetch_related('shared_with').all()
    serializer_class = ExpenseSerializer


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardSummaryView(APIView):
    """
    Returns aggregated financial metrics for the dashboard.
    Optionally filter by user_id query param.
    """
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

        nw = services.calculate_net_worth(accounts)
        cf = services.calculate_cash_flow(accounts)
        ef = services.calculate_emergency_fund(accounts)

        # Quick retirement readiness estimate using net worth data
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
        retirement = services.project_retirement(readiness_params)

        return Response({
            'net_worth': nw,
            'cash_flow': cf,
            'emergency_fund': ef,
            'retirement_readiness': retirement['readiness_score'],
            'fire_age': retirement['fire_age'],
        })


# ── Simulations ───────────────────────────────────────────────────────────────

class SimulationViewSet(viewsets.ModelViewSet):
    queryset = Simulation.objects.select_related('account').all()
    serializer_class = SimulationSerializer


class RetirementSimulationView(APIView):
    """Run a retirement projection given scenario parameters."""
    def post(self, request):
        params = request.data
        result = services.project_retirement(params)
        return Response(result, status=status.HTTP_200_OK)


# ── Distribution Rules ────────────────────────────────────────────────────────

class DistributionRuleViewSet(viewsets.ModelViewSet):
    queryset = DistributionRule.objects.select_related('asset', 'beneficiary').all()
    serializer_class = DistributionRuleSerializer
