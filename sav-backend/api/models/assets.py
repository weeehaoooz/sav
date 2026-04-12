from django.db import models
from django.utils import timezone


class Asset(models.Model):
    """Financial asset with multi-owner support."""

    ASSET_TYPE_CHOICES = [
        ('bank', 'Bank Account'),
        ('equity', 'Equities'),
        ('cpf', 'CPF'),
    ]

    name = models.CharField(max_length=200)
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPE_CHOICES)
    current_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # CPF breakdown fields
    cpf_oa = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cpf_sa = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cpf_ma = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cpf_ra = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    acquisition_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='SGD')
    valuation_date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assets'
        ordering = ['-current_value']

    def save(self, *args, **kwargs):
        if self.asset_type == 'cpf':
            self.current_value = self.cpf_oa + self.cpf_sa + self.cpf_ma + self.cpf_ra
        
        # Check if relevant values changed before creating history
        should_create_history = True
        if self.pk:
            old_instance = Asset.objects.get(pk=self.pk)
            # Compare current state with DB state
            if (old_instance.current_value == self.current_value and 
                old_instance.valuation_date == self.valuation_date and
                old_instance.cpf_oa == self.cpf_oa and
                old_instance.cpf_sa == self.cpf_sa and
                old_instance.cpf_ma == self.cpf_ma and
                old_instance.cpf_ra == self.cpf_ra):
                should_create_history = False

        super().save(*args, **kwargs)
        
        if should_create_history:
            # Create history snapshot
            AssetValuationHistory.objects.create(
                asset=self,
                valuation_date=self.valuation_date,
                current_value=self.current_value,
                cpf_oa=self.cpf_oa,
                cpf_sa=self.cpf_sa,
                cpf_ma=self.cpf_ma,
                cpf_ra=self.cpf_ra
            )

    def refresh_from_history(self):
        """Update the main asset fields from the latest valuation in history."""
        latest = self.valuation_history.first()
        if latest:
            self.current_value = latest.current_value
            self.valuation_date = latest.valuation_date
            self.cpf_oa = latest.cpf_oa
            self.cpf_sa = latest.cpf_sa
            self.cpf_ma = latest.cpf_ma
            self.cpf_ra = latest.cpf_ra
            # Save without triggering a new history record
            super().save()

    def __str__(self):
        return f"{self.name} ({self.asset_type})"


class AssetValuationHistory(models.Model):
    """Historical snapshot of an asset's valuation at a specific point in time."""

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='valuation_history')
    valuation_date = models.DateField()
    current_value = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Snapshot of CPF sub-accounts if applicable
    cpf_oa = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cpf_sa = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cpf_ma = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cpf_ra = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'asset_valuation_history'
        ordering = ['-valuation_date', '-created_at']

    def __str__(self):
        return f"{self.asset.name} - {self.valuation_date} - ${self.current_value}"


class AssetOwnership(models.Model):
    """Through model tracking which accounts own an asset and what percentage."""

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='ownerships')
    account = models.ForeignKey(
        'api.Account', on_delete=models.CASCADE, related_name='asset_ownerships'
    )
    ownership_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=100,
        help_text='Percentage of asset owned by this account (0-100)'
    )

    class Meta:
        db_table = 'asset_ownerships'
        unique_together = ('asset', 'account')

    def __str__(self):
        return f"{self.account.display_name} owns {self.ownership_percentage}% of {self.asset.name}"
