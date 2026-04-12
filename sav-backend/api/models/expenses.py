from django.db import models


class Expense(models.Model):
    """Expense record for a family account."""

    CATEGORY_CHOICES = [
        ('fixed', 'Fixed'),
        ('variable', 'Variable'),
        ('family', 'Family'),
        ('lifestyle', 'Lifestyle'),
        ('one_off', 'One-off'),
    ]

    FREQUENCY_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annually', 'Annually'),
        ('one_off', 'One-off'),
    ]

    account = models.ForeignKey(
        'api.Account', on_delete=models.CASCADE, related_name='expenses'
    )
    shared_with = models.ManyToManyField(
        'api.Account', blank=True, related_name='shared_expenses',
        help_text='Other accounts that share this expense'
    )
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='variable')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='monthly')
    inflation_rate = models.DecimalField(
        max_digits=6, decimal_places=4, default=0.02,
        help_text='Expected annual inflation for this expense'
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'expenses'
        ordering = ['-amount']

    def __str__(self):
        return f"{self.name} — {self.amount} ({self.category})"

    @property
    def monthly_equivalent(self):
        from decimal import Decimal
        multipliers = {
            'monthly': Decimal('1'),
            'quarterly': Decimal('1') / Decimal('3'),
            'annually': Decimal('1') / Decimal('12'),
            'one_off': Decimal('0'),
        }
        return self.amount * multipliers.get(self.frequency, Decimal('1'))
