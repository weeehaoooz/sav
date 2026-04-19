import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../../shared/services/auth.service';
import { UserService } from '../../../../shared/services/user.service';
import { ApiService } from '../../../../shared/services/api.service';

@Component({
  selector: 'app-account-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './account-details.component.html',
  styleUrls: ['./account-details.component.scss']
})
export class AccountDetailsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly userService = inject(UserService);
  private readonly api = inject(ApiService);

  profileForm = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    first_name: [''],
    last_name: ['']
  });

  loadingProfile = signal(false);
  message = signal<{ type: 'success' | 'error', text: string } | null>(null);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.profileForm.patchValue({
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      });
    }
  }

  updateProfile(): void {
    if (this.profileForm.invalid) return;
    this.loadingProfile.set(true);

    const values = this.profileForm.value;

    this.api.updateProfile(values as any).subscribe({
      next: (user) => {
        this.loadingProfile.set(false);
        // Update local auth service state
        localStorage.setItem('sav_user', JSON.stringify(user));
        this.auth.currentUser.set(user);

        this.message.set({ type: 'success', text: 'Profile updated successfully' });
        setTimeout(() => this.message.set(null), 3000);
      },
      error: (err) => {
        this.loadingProfile.set(false);
        this.message.set({ type: 'error', text: 'Failed to update profile' });
        setTimeout(() => this.message.set(null), 3000);
      }
    });
  }

  onAccountSwitch(accountId: number): void {
    const account = this.userService.accounts().find(a => a.id === accountId);
    if (account) {
      this.userService.selectedAccount.set(account);
    }
  }
}
