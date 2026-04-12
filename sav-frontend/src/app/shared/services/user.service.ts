import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Account } from '../models/account.model';

/**
 * Service for managing user-specific accounts/profiles.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private _accounts = signal<Account[]>([]);
  readonly accounts = this._accounts.asReadonly();
  readonly selectedAccount = signal<Account | null>(null);

  readonly accountOptions = computed(() =>
    this._accounts().map(a => ({
      value: a.id,
      label: a.display_name,
      type: a.account_type
    }))
  );

  constructor() {
    // Reactively load accounts when authentication state changes
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.loadAccounts();
      } else {
        this._accounts.set([]);
        this.selectedAccount.set(null);
      }
    });
  }

  loadAccounts(): void {
    this.api.getAccounts().subscribe(data => {
      this._accounts.set(data);
      // Auto-select primary account or first one
      if (!this.selectedAccount() && data.length > 0) {
        const primary = data.find(a => a.account_type === 'primary');
        this.selectedAccount.set(primary || data[0]);
      }
    });
  }

  selectAccount(account: Account): void {
    this.selectedAccount.set(account);
  }

  // Update internal signal after API mutations
  refreshAccounts(): void {
    this.loadAccounts();
  }
}
