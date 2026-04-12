from django.db import models


class Asset(models.Model):
    """Financial asset with multi-owner support."""

    ASSET_TYPE_CHOICES = [
        ('cpf', 'CPF'),
        ('bank', 'Bank Account'),
        ('equity', 'Equities'),
        ('property', 'Property'),
        ('crypto', 'Crypto'),
        ('insurance', 'Insurance (Cash Value)'),
        ('alternatives', 'Alternatives'),
    ]

    name = models.CharField(max_length=200)
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPE_CHOICES)
    current_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    acquisition_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    growth_rate = models.DecimalField(
        max_digits=6, decimal_places=4, default=0, help_text='Annual growth rate as decimal (e.g. 0.07 = 7%)'
    )
    liquidity_score = models.IntegerField(default=5, help_text='Liquidity score 1-10')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assets'
        ordering = ['-current_value']

    def __str__(self):
        return f"{self.name} ({self.asset_type})"


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
