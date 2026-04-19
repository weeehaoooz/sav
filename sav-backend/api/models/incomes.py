from django.db import models


class Income(models.Model):
    """Income stream for a family account."""

    INCOME_TYPE_CHOICES = [
        ('employment', 'Employment'),
    ]

    FREQUENCY_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annually', 'Annually'),
        ('one_off', 'One-off'),
    ]

    account = models.ForeignKey('api.Account', on_delete=models.CASCADE, related_name='incomes')
    name = models.CharField(max_length=200)
    income_type = models.CharField(max_length=30, choices=INCOME_TYPE_CHOICES, default='salary')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='monthly')
    notes = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'incomes'
        ordering = ['-amount']

    def __str__(self):
        return f"{self.name} — {self.amount} ({self.frequency})"

    @property
    def monthly_equivalent(self):
        """Convert any frequency to monthly equivalent."""
        from decimal import Decimal
        multipliers = {
            'monthly': Decimal('1'),
            'quarterly': Decimal('1') / Decimal('3'),
            'annually': Decimal('1') / Decimal('12'),
            'one_off': Decimal('0'),
        }
        return self.amount * multipliers.get(self.frequency, Decimal('1'))

class Employment(Income):
    company = models.CharField(max_length=200, blank=True, null=True)
    has_cpf = models.BooleanField(default=False)

    start_dt = models.DateField(null=False)
    end_dt = models.DateField(null=True)

    monthly = models.DecimalField(max_digits=15, decimal_places=2)
    average_growth_rate = models.DecimalField(max_digits=5, decimal_places=2, default=3.0)

    class Meta:
        db_table = 'employments'

    @property
    def take_home_amount(self):
        """Calculate take-home amount after employee CPF contribution."""
        if not self.has_cpf:
            return self.monthly
        
        from api.services.helpers import calculate_cpf_contributions
        age = self.account.age or 30
        employee_cpf, _ = calculate_cpf_contributions(self.monthly, age=age)
        return self.monthly - employee_cpf

    @property
    def additional_contributions(self):
        """Calculate employer CPF contributions."""
        if not self.has_cpf:
            return 0
        
        from api.services.helpers import calculate_cpf_contributions
        age = self.account.age or 30
        _, employer_cpf = calculate_cpf_contributions(self.monthly, age=age)
        return employer_cpf


class EmploymentBonus(models.Model):
    MONTH_CHOICES = [
        (1, 'January'), (2, 'February'), (3, 'March'), (4, 'April'),
        (5, 'May'), (6, 'June'), (7, 'July'), (8, 'August'),
        (9, 'September'), (10, 'October'), (11, 'November'), (12, 'December'),
    ]

    employment = models.ForeignKey(Employment, on_delete=models.CASCADE, related_name='bonuses')
    month = models.IntegerField(choices=MONTH_CHOICES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = 'employment_bonuses'
        ordering = ['month']

    def __str__(self):
        return f"{self.get_month_display()} — {self.amount}"