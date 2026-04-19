from rest_framework import viewsets
from api.models import Income
from api.serializers.incomes import IncomeSerializer

class IncomeViewSet(viewsets.ModelViewSet):
    serializer_class = IncomeSerializer

    def get_queryset(self):
        """Return incomes belonging to the authenticated user's accounts."""
        if not self.request.user.is_authenticated:
            return Income.objects.none()
            
        return Income.objects.filter(
            account__user=self.request.user
        ).select_related('account').all()

    def perform_create(self, serializer):
        """Ensure the income is created for an account the user owns."""
        # The serializer handles the model instantiation (Income vs Employment)
        serializer.save()
