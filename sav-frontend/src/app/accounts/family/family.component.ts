import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { AccountCardComponent } from '../../shared/components/account-card/account-card.component';
import { Account } from '../../shared/models/account.model';
import { MemberFormComponent } from './components/member-form/member-form.component';

@Component({
  selector: 'app-family',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatSnackBarModule, PageHeaderComponent, AccountCardComponent,
    MemberFormComponent,
  ],
  templateUrl: './family.component.html',
  styleUrls: ['./family.component.scss'],
})
export class FamilyComponent {
  readonly state = inject(StateService);
  readonly userService = inject(UserService);
  private readonly api = inject(ApiService);
  private readonly snackbar = inject(MatSnackBar);

  readonly showForm = signal(false);
  readonly editingAccount = signal<Account | null>(null);
  readonly saving = signal(false);

  openCreate(): void {
    this.editingAccount.set(null);
    this.showForm.set(true);
  }

  openEdit(account: Account): void {
    this.editingAccount.set(account);
    this.showForm.set(true);
  }

  save(formData: any): void {
    this.saving.set(true);
    const data = { ...formData };

    // Convert empty date to null
    if (!data.date_of_birth) data.date_of_birth = null;

    // Hardcode user ID for MVP
    data.user = 1;

    const account = this.editingAccount();
    const obs = account ? this.api.updateAccount(account.id, data) : this.api.createAccount(data);
    
    obs.subscribe({
      next: () => {
        this.userService.refreshAccounts();
        this.showForm.set(false);
        this.saving.set(false);
        this.snackbar.open(account ? 'Account updated' : 'Account created', 'Close', { duration: 3000 });
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
}
