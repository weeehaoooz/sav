from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('', include('api.urls.users')),
    path('', include('api.urls.accounts')),
    path('', include('api.urls.assets')),
    path('', include('api.urls.liabilities')),
    path('', include('api.urls.incomes')),
    path('', include('api.urls.expenses')),
    path('', include('api.urls.simulations')),
    path('', include('api.urls.dashboard')),
    path('taxes/', include('api.urls.taxes')),
    
    # Auth
    path('auth/', include('dj_rest_auth.urls')),
    path('auth/register/', include('dj_rest_auth.registration.urls')),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
