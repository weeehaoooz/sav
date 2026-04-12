from django.urls import path, include
from rest_framework.routers import SimpleRouter
from api.views.users import UserViewSet, ProfileView

router = SimpleRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('profile/', ProfileView.as_view(), name='profile'),
    path('', include(router.urls)),
]
