from django.db import models


class Simulation(models.Model):
    """Stores a named simulation and its computed results."""

    SIMULATION_TYPE_CHOICES = [
        ('retirement', 'Retirement Projection'),
        ('fire', 'FIRE Analysis'),
        ('education', 'Education Fund'),
        ('property_upgrade', 'Property Upgrade'),
        ('tax', 'Tax Simulation'),
    ]

    account = models.ForeignKey(
        'api.Account', on_delete=models.CASCADE, related_name='simulations'
    )
    name = models.CharField(max_length=200, default='Untitled Simulation')
    simulation_type = models.CharField(
        max_length=30, choices=SIMULATION_TYPE_CHOICES, default='retirement'
    )
    scenario_params = models.JSONField(default=dict, help_text='Input parameters for the simulation')
    results = models.JSONField(null=True, blank=True, help_text='Computed results stored as JSON')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'simulations'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.simulation_type})"


class DistributionRule(models.Model):
    """Age-based asset distribution rule for inheritance planning."""

    asset = models.ForeignKey(
        'api.Asset', on_delete=models.CASCADE, related_name='distribution_rules'
    )
    beneficiary = models.ForeignKey(
        'api.Account', on_delete=models.CASCADE, related_name='distribution_rules'
    )
    percentage = models.DecimalField(max_digits=5, decimal_places=2, help_text='Percentage to distribute')
    unlock_age = models.IntegerField(null=True, blank=True, help_text='Age at which this distribution unlocks')
    condition_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'distribution_rules'

    def __str__(self):
        return f"{self.percentage}% of {self.asset.name} to {self.beneficiary.display_name} at age {self.unlock_age}"
