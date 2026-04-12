from rest_framework import serializers
from api.models import Simulation

class SimulationSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.display_name', read_only=True)

    class Meta:
        model = Simulation
        fields = [
            'id', 'account', 'account_name', 'name', 'simulation_type',
            'scenario_params', 'results', 'created_at', 'updated_at'
        ]
        read_only_fields = ['results', 'created_at', 'updated_at']
