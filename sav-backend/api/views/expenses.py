from rest_framework import viewsets
from api.models import Expense
from api.serializers.expenses import ExpenseSerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('account').prefetch_related('shared_with').all()
    serializer_class = ExpenseSerializer
