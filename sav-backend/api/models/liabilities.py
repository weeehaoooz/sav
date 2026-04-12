from django.db import models


class Liability(models.Model):
    """Debt/liability linked to a family account."""

    LIABILITY_TYPE_CHOICES = [
        ('mortgage', 'Mortgage'),
        ('car_loan', 'Car Loan'),
        ('student_loan', 'Student Loan'),
        ('credit_card', 'Credit Card'),
        ('personal_loan', 'Personal Loan'),
    ]

    FREQUENCY_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annually', 'Annually'),
    ]

    owner = models.ForeignKey(
        'api.Account', on_delete=models.CASCADE, related_name='liabilities'
    )
    name = models.CharField(max_length=200)
    liability_type = models.CharField(max_length=20, choices=LIABILITY_TYPE_CHOICES, default='personal_loan')
    principal = models.DecimalField(max_digits=15, decimal_places=2)
    outstanding_balance = models.DecimalField(max_digits=15, decimal_places=2)
    interest_rate = models.DecimalField(
        max_digits=6, decimal_places=4, help_text='Annual interest rate as decimal (e.g. 0.025 = 2.5%)'
    )
    tenure_months = models.IntegerField(help_text='Total loan tenure in months')
    payment_frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='monthly')
    linked_asset = models.ForeignKey(
        'api.Asset', on_delete=models.SET_NULL, null=True, blank=True, related_name='linked_liabilities'
    )
    start_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'liabilities'
        ordering = ['-outstanding_balance']

    def __str__(self):
        return f"{self.name} ({self.liability_type}) — ${self.outstanding_balance}"
