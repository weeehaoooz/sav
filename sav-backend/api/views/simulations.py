from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from api.models import Simulation
from api.serializers.simulations import SimulationSerializer
from api.services.simulations import project_retirement

class SimulationViewSet(viewsets.ModelViewSet):
    queryset = Simulation.objects.select_related('account').all()
    serializer_class = SimulationSerializer

class RetirementSimulationView(APIView):
    def post(self, request):
        params = request.data
        result = project_retirement(params)
        return Response(result, status=status.HTTP_200_OK)
