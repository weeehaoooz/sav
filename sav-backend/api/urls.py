from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    UserViewSet, AccountViewSet, AssetViewSet, LiabilityViewSet,
    IncomeViewSet, ExpenseViewSet, SimulationViewSet, DistributionRuleViewSet,
    DashboardSummaryView, RetirementSimulationView, ProfileView
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'accounts', AccountViewSet)
router.register(r'assets', AssetViewSet)
router.register(r'liabilities', LiabilityViewSet)
router.register(r'income', IncomeViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'simulations', SimulationViewSet)
router.register(r'distribution-rules', DistributionRuleViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('simulations/run/retirement/', RetirementSimulationView.as_view(), name='run-retirement'),
    
    # Auth
    path('auth/', include('dj_rest_auth.urls')),
    path('auth/registration/', include('dj_rest_auth.registration.urls')),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User Profile
    path('profile/', ProfileView.as_view(), name='profile'),
]
