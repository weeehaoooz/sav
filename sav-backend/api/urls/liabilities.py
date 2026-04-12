from django.urls import path, include
from rest_framework.routers import SimpleRouter
from api.views.liabilities import LiabilityViewSet

router = SimpleRouter()
router.register(r'liabilities', LiabilityViewSet, basename='liability')

urlpatterns = [
    path('', include(router.urls)),
]
