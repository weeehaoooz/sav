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
        ordering = ['-valuation_date', '-id']

    def save(self, *args, **kwargs):
        if self.asset_type == 'cpf':
            self.current_value = self.cpf_oa + self.cpf_sa + self.cpf_ma + self.cpf_ra
        
        # Check if we are updating an existing asset or creating a new one
        is_new = self.pk is None
        should_create_history = True
        is_older_valuation = False

        if not is_new:
            try:
                db_instance = Asset.objects.get(pk=self.pk)
                
                # Check if incoming valuation is older than what we have in DB
                if self.valuation_date < db_instance.valuation_date:
                    is_older_valuation = True
                
                # Check if relevant values changed before creating history
                if (db_instance.current_value == self.current_value and 
                    db_instance.valuation_date == self.valuation_date and
                    db_instance.cpf_oa == self.cpf_oa and
                    db_instance.cpf_sa == self.cpf_sa and
                    db_instance.cpf_ma == self.cpf_ma and
                    db_instance.cpf_ra == self.cpf_ra):
                    should_create_history = False
            except Asset.DoesNotExist:
                is_new = True

        if is_older_valuation:
            # If it's an older valuation, we want to create the history entry 
            # with the incoming values, but NOT update the main Asset's valuation fields.
            # However, we DO want to save other potential field changes (like name).
            
            # 1. Create history entry manually
            AssetValuationHistory.objects.create(
                asset=self,
                valuation_date=self.valuation_date,
                current_value=self.current_value,
                acquisition_value=self.acquisition_value,
                cpf_oa=self.cpf_oa,
                cpf_sa=self.cpf_sa,
                cpf_ma=self.cpf_ma,
                cpf_ra=self.cpf_ra
            )
            
            # 2. Revert valuation fields on self to DB state
            self.current_value = db_instance.current_value
            self.valuation_date = db_instance.valuation_date
            self.cpf_oa = db_instance.cpf_oa
            self.cpf_sa = db_instance.cpf_sa
            self.cpf_ma = db_instance.cpf_ma
            self.cpf_ra = db_instance.cpf_ra
            
            # 3. Save purely the name/type updates
            super().save(*args, **kwargs)
        else:
            # Normal flow (new asset or newer/equal valuation)
            super().save(*args, **kwargs)
            
            if should_create_history:
                AssetValuationHistory.objects.create(
                    asset=self,
                    valuation_date=self.valuation_date,
                    current_value=self.current_value,
                    acquisition_value=self.acquisition_value,
                    cpf_oa=self.cpf_oa,
                    cpf_sa=self.cpf_sa,
                    cpf_ma=self.cpf_ma,
                    cpf_ra=self.cpf_ra
                )
        
        # Finally, always ensure we are in sync with the actual "latest" history 
        # (covers deletions and ensures consistency)
        self.refresh_from_history()

    def refresh_from_history(self):
        """Update the main asset fields from the latest valuation in history."""
        # Use a fresh query to bypass any prefetched cache on the instance
        latest = AssetValuationHistory.objects.filter(asset=self).order_by('-valuation_date', '-created_at').first()
        if latest:
            # Only update and call super().save() if fields actually differ 
            # to avoid infinite recursion or unnecessary DB hits
            if (float(self.current_value) != float(latest.current_value) or
                self.valuation_date != latest.valuation_date or
                float(self.cpf_oa) != float(latest.cpf_oa) or
                float(self.cpf_sa) != float(latest.cpf_sa) or
                float(self.cpf_ma) != float(latest.cpf_ma) or
                float(self.cpf_ra) != float(latest.cpf_ra)):
                
                self.current_value = latest.current_value
                self.valuation_date = latest.valuation_date
                self.cpf_oa = latest.cpf_oa
                self.cpf_sa = latest.cpf_sa
                self.cpf_ma = latest.cpf_ma
                self.cpf_ra = latest.cpf_ra
                super().save()
        else:
            # If all history is deleted, we might want to keep the current values 
            # or reset them. Given the user context, keeping them is probably safer 
            # but they now represent the "base" or "acquisition" state.
            pass

    def __str__(self):
        return f"{self.name} ({self.asset_type})"


class AssetValuationHistory(models.Model):
    """Historical snapshot of an asset's valuation at a specific point in time."""

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='valuation_history')
    valuation_date = models.DateField()
    current_value = models.DecimalField(max_digits=15, decimal_places=2)
    acquisition_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
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
