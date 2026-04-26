from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from decimal import Decimal
from api.services.tax_service import TAX_BRACKETS, simulate_tax_savings, calculate_tax

class TaxBracketsView(APIView):
    """Serve the current tax brackets."""
    def get(self, request):
        brackets = [
            {'limit': limit if limit != float('inf') else None, 'rate': float(rate)}
            for limit, rate in TAX_BRACKETS
        ]
        return Response(brackets, status=status.HTTP_200_OK)

class TaxSimulationView(APIView):
    """Run a tax simulation based on provided income and reliefs."""
    def post(self, request):
        data = request.data
        
        try:
            assessable_income = Decimal(str(data.get('assessable_income', 0)))
            base_reliefs = [Decimal(str(r)) for r in data.get('base_reliefs', [])]
            additional_reliefs = [Decimal(str(r)) for r in data.get('additional_reliefs', [])]
            
            result = simulate_tax_savings(assessable_income, base_reliefs, additional_reliefs)
            
            return Response(result, status=status.HTTP_200_OK)
        except (ValueError, TypeError) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
