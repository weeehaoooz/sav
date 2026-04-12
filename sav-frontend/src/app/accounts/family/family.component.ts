import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { StateService } from '../../shared/services/state.service';
import { ApiService } from '../../shared/services/api.service';
import { UserService } from '../../shared/services/user.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { Account, AccountType, AccountRole } from '../../shared/models/account.model';

@Component({
  selector: 'app-family',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatSnackBarModule, PageHeaderComponent,
  ],
  templateUrl: './family.component.html',
  styleUrls: ['./family.component.scss'],
})
export class FamilyComponent {
  readonly state = inject(StateService);
  readonly userService = inject(UserService);
  private readonly api = inject(ApiService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly showForm = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);

  readonly accountTypes: { value: AccountType; label: string }[] = [
    { value: 'primary', label: 'Primary User' },
    { value: 'partner', label: 'Partner / Spouse' },
    { value: 'child_minor', label: 'Child (Minor)' },
    { value: 'child_teen', label: 'Child (Teen)' },
    { value: 'dependent', label: 'Other Dependent' },
  ];

  readonly accountRoles: { value: AccountRole; label: string }[] = [
    { value: 'owner', label: 'Owner (Full Access)' },
    { value: 'co_owner', label: 'Co-owner (Manage All)' },
    { value: 'viewer', label: 'Viewer (Read-only)' },
    { value: 'trustee', label: 'Trustee (Managed for)' },
  ];

  readonly avatarColors = [
    '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#3b82f6'
  ];

  readonly accountForm = this.fb.group({
    display_name: ['', Validators.required],
    account_type: ['child_minor' as AccountType, Validators.required],
    role: ['trustee' as AccountRole, Validators.required],
    date_of_birth: [''],
    avatar_color: ['#6366f1', Validators.required],
  });

  openCreate(): void {
    this.editingId.set(null);
    this.accountForm.reset({
      account_type: 'child_minor',
      role: 'trustee',
      avatar_color: this.avatarColors[Math.floor(Math.random() * this.avatarColors.length)],
    });
    this.showForm.set(true);
  }

  openEdit(account: Account): void {
    this.editingId.set(account.id);
    this.accountForm.patchValue({
      display_name: account.display_name,
      account_type: account.account_type,
      role: account.role,
      date_of_birth: account.date_of_birth,
      avatar_color: account.avatar_color,
    });
    this.showForm.set(true);
  }

  save(): void {
    if (this.accountForm.invalid) return;
    this.saving.set(true);
    const data = this.accountForm.value as any;

    // Convert empty date to null
    if (!data.date_of_birth) data.date_of_birth = null;

    // Hardcode user ID for MVP
    data.user = 1;

    const id = this.editingId();
    const obs = id ? this.api.updateAccount(id, data) : this.api.createAccount(data);
    obs.subscribe({
      next: () => {
        this.userService.refreshAccounts();
        this.showForm.set(false);
        this.saving.set(false);
        this.snackbar.open(id ? 'Account updated' : 'Account created', 'Close', { duration: 3000 });
      },
      error: () => this.saving.set(false),
    });
  }

  deleteAccount(id: number): void {
    if (id === 1) { // Stop deletion of primary account as safety in MVP
      this.snackbar.open('Cannot delete primary account', 'Close', { duration: 3000 });
      return;
    }
    this.api.deleteAccount(id).subscribe({
      next: () => {
        this.userService.refreshAccounts();
        this.snackbar.open('Account deleted', 'Close', { duration: 3000 });
      },
    });
  }

  cancelForm(): void {
    this.showForm.set(false);
  }

  getInitials(name: string): string {
    if (!name) return '??';
    return name.substring(0, 2).toUpperCase();
  }
}
