from django.urls import path, include
from rest_framework.routers import SimpleRouter
from api.views.incomes import IncomeViewSet

router = SimpleRouter()
router.register(r'income', IncomeViewSet, basename='income')

urlpatterns = [
    path('', include(router.urls)),
]
