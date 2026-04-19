import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Liability } from '../models/liability.model';

@Injectable({ providedIn: 'root' })
export class LiabilityService {
  private readonly api = inject(ApiService);

  private readonly _liabilities = signal<Liability[]>([]);
  readonly liabilities = this._liabilities.asReadonly();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly totalLiabilityValue = computed(() =>
    this._liabilities().reduce((sum, l) => sum + (Number(l.outstanding_balance) || 0), 0)
  );

  loadLiabilities(): void {
    this.loading.set(true);
    this.api.getLiabilities().subscribe({
      next: (data) => {
        this._liabilities.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load liabilities');
        this.loading.set(false);
      },
    });
  }

  addLiability(liability: Liability): void {
    this._liabilities.update((list) => [liability, ...list]);
  }

  updateLiability(updated: Liability): void {
    this._liabilities.update((list) =>
      list.map((l) => (l.id === updated.id ? updated : l))
    );
  }

  removeLiability(id: number): void {
    this._liabilities.update((list) => list.filter((l) => l.id !== id));
  }
}
