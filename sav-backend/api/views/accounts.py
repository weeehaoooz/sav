from rest_framework import viewsets
from api.models import Account
from api.serializers.accounts import AccountSerializer

class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.select_related('user').all()
    serializer_class = AccountSerializer
