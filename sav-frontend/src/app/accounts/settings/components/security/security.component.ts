import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../shared/services/auth.service';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './security.component.html',
  styleUrls: ['./security.component.scss']
})
export class SecurityComponent {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  });

  loadingPassword = signal(false);
  message = signal<{ type: 'success' | 'error', text: string } | null>(null);

  updatePassword(): void {
    if (this.passwordForm.invalid) return;
    
    // Password match check
    if (this.passwordForm.value.newPassword !== this.passwordForm.value.confirmPassword) {
      this.message.set({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    this.loadingPassword.set(true);
    // Call backend API
    setTimeout(() => {
      this.loadingPassword.set(false);
      this.message.set({ type: 'success', text: 'Password changed successfully' });
      this.passwordForm.reset();
      
      // Auto-clear message after 3s
      setTimeout(() => this.message.set(null), 3000);
    }, 1000);
  }
}
