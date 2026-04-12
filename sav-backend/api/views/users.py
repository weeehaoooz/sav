from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from api.models import CustomUser
from api.serializers.users import CustomUserSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer

class ProfileView(APIView):
    def get(self, request):
        serializer = CustomUserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = CustomUserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
