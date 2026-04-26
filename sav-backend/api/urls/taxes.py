from django.urls import path
from api.views.taxes import TaxBracketsView, TaxSimulationView

urlpatterns = [
    path('brackets/', TaxBracketsView.as_view(), name='tax-brackets'),
    path('simulate/', TaxSimulationView.as_view(), name='tax-simulate'),
]
