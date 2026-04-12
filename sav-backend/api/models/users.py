import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """Extended user model with family grouping."""
    family_id = models.UUIDField(default=uuid.uuid4, db_index=True, editable=False)

    class Meta:
        db_table = 'users'
        verbose_name = 'User'

    def __str__(self):
        return self.email or self.username
