from django.urls import path, include
from rest_framework.routers import SimpleRouter
from api.views.simulations import SimulationViewSet, RetirementSimulationView


router = SimpleRouter()
router.register(r'simulations', SimulationViewSet, basename='simulation')

urlpatterns = [
    path('simulations/run/retirement/', RetirementSimulationView.as_view(), name='run-retirement'),
    path('', include(router.urls)),
]
