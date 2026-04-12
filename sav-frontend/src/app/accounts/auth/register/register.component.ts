import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../shared/services/auth.service';
import { LogoComponent } from '../../../shared/components/logo/logo.component';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    LogoComponent,
    ThemeToggleComponent
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  registerForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    first_name: ['', [Validators.required]],
    last_name: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', [Validators.required]]
  });

  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  loading = signal(false);
  error = signal<string | null>(null);

  togglePassword(event: MouseEvent): void {
    this.hidePassword.update(v => !v);
    event.preventDefault();
  }

  toggleConfirmPassword(event: MouseEvent): void {
    this.hideConfirmPassword.update(v => !v);
    event.preventDefault();
  }

  passwordMismatch(): boolean {
    const { password, confirm_password } = this.registerForm.value;
    return !!password && !!confirm_password && password !== confirm_password;
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.passwordMismatch()) return;

    this.loading.set(true);
    this.error.set(null);

    const val = this.registerForm.value;
    this.authService.register({
      username: val.username!,
      email: val.email!,
      first_name: val.first_name!,
      last_name: val.last_name!,
      password: val.password!,
      confirm_password: val.confirm_password!
    }).subscribe({
      next: () => {
        this.router.navigateByUrl('/dashboard');
        this.loading.set(false);
      },
      error: (err) => {
        const detail = err.error;
        if (typeof detail === 'object') {
          const messages = Object.values(detail).flat().join(' ');
          this.error.set(messages || 'Registration failed. Please try again.');
        } else {
          this.error.set(err.error?.detail || 'Registration failed. Please try again.');
        }
        this.loading.set(false);
      }
    });
  }
}