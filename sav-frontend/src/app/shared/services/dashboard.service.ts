import { Injectable, signal, inject, computed } from '@angular/core';
import { ApiService } from './api.service';
import { DashboardSummary } from '../models/dashboard.model';
import { IncomeService } from './income.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);
  private readonly incomeService = inject(IncomeService);

  private readonly _dashboard = signal<DashboardSummary | null>(null);
  readonly dashboard = this._dashboard.asReadonly();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  loadDashboardSummary(accountId?: number): void {
    this.loading.set(true);
    this.api.getDashboardSummary(undefined, accountId).subscribe({
      next: (data) => {
        this._dashboard.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load dashboard summary');
        this.loading.set(false);
      },
    });
  }
}
