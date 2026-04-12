from django.urls import path, include
from rest_framework.routers import SimpleRouter
from api.views.accounts import AccountViewSet

router = SimpleRouter()
router.register(r'accounts', AccountViewSet, basename='account')

urlpatterns = [
    path('', include(router.urls)),
]
