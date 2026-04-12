from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from api.models import Liability
from api.serializers.liabilities import LiabilitySerializer
from api.services.liabilities import generate_amortisation_schedule

class LiabilityViewSet(viewsets.ModelViewSet):
    queryset = Liability.objects.select_related('owner', 'linked_asset').all()
    serializer_class = LiabilitySerializer

    @action(detail=True, methods=['get'], url_path='amortisation')
    def amortisation(self, request, pk=None):
        liability = self.get_object()
        schedule = generate_amortisation_schedule(liability)
        return Response({'schedule': schedule, 'total_periods': len(schedule)})
