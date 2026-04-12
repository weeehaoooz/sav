from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from api.models import Asset, AssetValuationHistory, DistributionRule
from api.serializers.assets import AssetSerializer, AssetWriteSerializer, AssetValuationHistorySerializer, DistributionRuleSerializer

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.prefetch_related('ownerships__account', 'valuation_history').all()

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
        asset.refresh_from_history()
        return response

class DistributionRuleViewSet(viewsets.ModelViewSet):
    queryset = DistributionRule.objects.select_related('asset', 'beneficiary').all()
    serializer_class = DistributionRuleSerializer
