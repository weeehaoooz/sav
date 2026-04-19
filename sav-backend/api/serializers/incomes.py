from rest_framework import serializers
from api.models import Income, Account
from api.models.incomes import Employment, EmploymentBonus

class EmploymentBonusSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmploymentBonus
        fields = ['id', 'month', 'amount']

class IncomeSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.display_name', read_only=True)
    monthly_equivalent = serializers.ReadOnlyField()
    dob = serializers.DateField(source='account.date_of_birth', read_only=True)
    
    # Employment specific fields (mapped to Employment model if applicable)
    company = serializers.CharField(required=False, allow_null=True)
    has_cpf = serializers.BooleanField(required=False, default=False)
    take_home_amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    additional_contributions = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    
    # Extra employment fields needed for creation
    start_dt = serializers.DateField(required=False, allow_null=True)
    end_dt = serializers.DateField(required=False, allow_null=True)
    monthly = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    average_growth_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=3.0)
    bonuses = EmploymentBonusSerializer(many=True, required=False)

    class Meta:
        model = Income
        fields = [
            'id', 'account', 'account_name', 'name', 'company', 'income_type', 'has_cpf',
            'amount', 'frequency', 'is_active', 'notes', 'monthly_equivalent', 'dob',
            'take_home_amount', 'additional_contributions', 'created_at', 'updated_at',
            'start_dt', 'end_dt', 'monthly', 'average_growth_rate', 'bonuses'
        ]
        read_only_fields = ['created_at', 'updated_at', 'take_home_amount', 'additional_contributions']

    def to_representation(self, instance):
        """Handle Employment specific fields if the instance is an Employment object."""
        # Use child instance properties if available (multi-table inheritance)
        if hasattr(instance, 'employment'):
            instance = instance.employment
            
        data = super().to_representation(instance)
        
        # If it's an employment record, include the specific fields
        if isinstance(instance, Employment):
            data['company'] = instance.company
            data['has_cpf'] = instance.has_cpf
            data['take_home_amount'] = instance.take_home_amount
            data['additional_contributions'] = instance.additional_contributions
            data['start_dt'] = instance.start_dt
            data['end_dt'] = instance.end_dt
            data['monthly'] = instance.monthly
            data['average_growth_rate'] = instance.average_growth_rate
            data['bonuses'] = EmploymentBonusSerializer(instance.bonuses.all(), many=True).data
            
        return data

    def create(self, validated_data):
        income_type = validated_data.get('income_type')
        bonuses_data = validated_data.pop('bonuses', [])
        
        if income_type == 'employment':
            # Extract employment-specific fields
            company = validated_data.pop('company', None)
            has_cpf = validated_data.pop('has_cpf', False)
            start_dt = validated_data.pop('start_dt', None) or '2000-01-01' # Fallback
            end_dt = validated_data.pop('end_dt', None)
            monthly = validated_data.pop('monthly', validated_data.get('amount'))
            average_growth_rate = validated_data.pop('average_growth_rate', 3.0)
            
            employment = Employment.objects.create(
                company=company,
                has_cpf=has_cpf,
                start_dt=start_dt,
                end_dt=end_dt,
                monthly=monthly,
                average_growth_rate=average_growth_rate,
                **validated_data
            )

            for bonus_data in bonuses_data:
                EmploymentBonus.objects.create(employment=employment, **bonus_data)
            
            return employment
            
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Downcast to employment if needed
        if hasattr(instance, 'employment'):
            instance = instance.employment
            
        bonuses_data = validated_data.pop('bonuses', None)

        if isinstance(instance, Employment):
            instance.company = validated_data.pop('company', instance.company)
            instance.has_cpf = validated_data.pop('has_cpf', instance.has_cpf)
            instance.start_dt = validated_data.pop('start_dt', instance.start_dt)
            instance.end_dt = validated_data.pop('end_dt', instance.end_dt)
            instance.monthly = validated_data.pop('monthly', instance.monthly)
            instance.average_growth_rate = validated_data.pop('average_growth_rate', instance.average_growth_rate)
            
            if bonuses_data is not None:
                # Simple implementation: delete and recreate bonuses
                instance.bonuses.all().delete()
                for bonus_data in bonuses_data:
                    EmploymentBonus.objects.create(employment=instance, **bonus_data)

        return super().update(instance, validated_data)
