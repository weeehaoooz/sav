from django.urls import path, include
from rest_framework.routers import SimpleRouter
from api.views.expenses import ExpenseViewSet

router = SimpleRouter()
router.register(r'expenses', ExpenseViewSet, basename='expense')

urlpatterns = [
    path('', include(router.urls)),
]
