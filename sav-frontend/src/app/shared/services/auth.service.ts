import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, of, Observable } from 'rxjs';
import { User } from '../models/user.model';

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = 'http://127.0.0.1:8000/api/auth';

  readonly currentUser = signal<User | null>(this.getUserFromStorage());
  readonly isAuthenticated = signal<boolean>(!!this.getToken());

  private getUserFromStorage(): User | null {
    const user = localStorage.getItem('sav_user');
    return user ? JSON.parse(user) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('sav_access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('sav_refresh_token');
  }

  register(data: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    confirm_password: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register/`, data).pipe(
      tap(res => this.setSession(res)),
      catchError(err => {
        console.error('Registration failed', err);
        throw err;
      })
    );
  }

  login(credentials: { username: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login/`, credentials).pipe(
      tap(res => this.setSession(res)),
      catchError(err => {
        console.error('Login failed', err);
        throw err;
      })
    );
  }

  logout(): void {
    localStorage.removeItem('sav_access_token');
    localStorage.removeItem('sav_refresh_token');
    localStorage.removeItem('sav_user');
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<{ access: string }> {
    const refresh = this.getRefreshToken();
    if (!refresh) return of({ access: '' });

    return this.http.post<{ access: string }>(`${this.baseUrl}/token/refresh/`, { refresh }).pipe(
      tap(res => localStorage.setItem('sav_access_token', res.access))
    );
  }

  private setSession(authResult: AuthResponse): void {
    localStorage.setItem('sav_access_token', authResult.access);
    localStorage.setItem('sav_refresh_token', authResult.refresh);
    localStorage.setItem('sav_user', JSON.stringify(authResult.user));
    this.currentUser.set(authResult.user);
    this.isAuthenticated.set(true);
  }

  // OAuth Placeholder
  loginWithGoogle(): void {
    // In a real app, this would redirect to the Google OAuth endpoint
    console.log('Redirecting to Google OAuth...');
    window.location.href = `${this.baseUrl}/google/login/`;
  }
}
