from django.db import models


class Income(models.Model):
    """Income stream for a family account."""

    INCOME_TYPE_CHOICES = [
        ('salary', 'Salary'),
        ('bonus', 'Bonus'),
        ('dividends', 'Dividends'),
        ('rental', 'Rental Income'),
        ('side_income', 'Side Income'),
        ('cpf_contribution', 'CPF Contribution'),
        ('other', 'Other'),
    ]

    FREQUENCY_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annually', 'Annually'),
        ('one_off', 'One-off'),
    ]

    account = models.ForeignKey(
        'api.Account', on_delete=models.CASCADE, related_name='incomes'
    )
    name = models.CharField(max_length=200)
    income_type = models.CharField(max_length=30, choices=INCOME_TYPE_CHOICES, default='salary')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='monthly')
    growth_rate = models.DecimalField(
        max_digits=6, decimal_places=4, default=0,
        help_text='Annual growth rate as decimal'
    )
    volatility = models.DecimalField(
        max_digits=6, decimal_places=4, default=0,
        help_text='Income volatility/uncertainty factor'
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
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
