from django.conf import settings
from django.db import models


class Account(models.Model):
    """Represents a person within a family financial structure.

    Each User has exactly one primary Account (profile) via one-to-one relationship.
    Accounts can belong to multiple families through FamilyMember relationships.
    """

    ACCOUNT_TYPE_CHOICES = [
        ('primary', 'Primary'),
        ('partner', 'Partner'),
        ('child_minor', 'Child (Minor)'),
        ('child_teen', 'Child (Teen)'),
        ('dependent', 'Dependent'),
    ]

    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('co_owner', 'Co-owner'),
        ('viewer', 'Viewer'),
        ('trustee', 'Trustee'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='accounts')
    display_name = models.CharField(max_length=150)
    account_type = models.CharField(
        max_length=20, choices=ACCOUNT_TYPE_CHOICES, default='primary'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='owner')
    avatar_color = models.CharField(max_length=7, default='#6366f1')  # hex color
    date_of_birth = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'accounts'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.display_name} ({self.account_type})"

    @property
    def age(self):
        """Calculate age from date_of_birth."""
        if self.date_of_birth:
            from datetime import date
            today = date.today()
            return (
                today.year
                - self.date_of_birth.year
                - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
            )
        return None
