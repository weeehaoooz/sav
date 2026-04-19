from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Extended user model with one-to-one relationship to primary Account."""

    # One-to-one relationship to user's primary profile/account
    profile = models.OneToOneField(
        'Account',
        on_delete=models.CASCADE,
        related_name='primary_user_profile',
        null=True,
        blank=True,
        editable=False
    )

    class Meta:
        db_table = 'users'
        verbose_name = 'User'

    def __str__(self):
        return self.email or self.username

    @property
    def account_type(self):
        """Convenience property to access account type from linked profile."""
        if self.profile:
            return self.profile.account_type
        return None

    @property
    def account_role(self):
        """Convenience property to access account role from linked profile."""
        if self.profile:
            return self.profile.role
        return None
