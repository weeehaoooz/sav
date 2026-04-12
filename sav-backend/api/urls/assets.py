from django.urls import path, include
from rest_framework.routers import SimpleRouter
from api.views.assets import AssetViewSet, AssetValuationHistoryViewSet, DistributionRuleViewSet

router = SimpleRouter()
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'asset-history', AssetValuationHistoryViewSet, basename='assethistory')
router.register(r'distribution-rules', DistributionRuleViewSet, basename='distributionrule')

urlpatterns = [
    path('', include(router.urls)),
]
