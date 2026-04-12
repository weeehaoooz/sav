from rest_framework import viewsets
from api.models import Income
from api.serializers.incomes import IncomeSerializer

class IncomeViewSet(viewsets.ModelViewSet):
    queryset = Income.objects.select_related('account').all()
    serializer_class = IncomeSerializer
