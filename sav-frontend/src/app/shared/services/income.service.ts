import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Income } from '../models/income.model';

@Injectable({ providedIn: 'root' })
export class IncomeService {
  private readonly api = inject(ApiService);

  private readonly _income = signal<Income[]>([]);
  readonly income = this._income.asReadonly();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly totalMonthlyIncome = computed(() =>
    this._income().reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  )

  loadIncome(): void {
    this.loading.set(true);
    this.api.getIncomes().subscribe({
      next: (data) => {
        this._income.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load income');
        this.loading.set(false);
      },
    });
  }

  getIncome(id: number): Observable<Income> {
    return this.api.getIncome(id);
  }

  addIncome(item: Income): void {
    this._income.update((list) => [item, ...list]);
  }

  updateIncome(updated: Income): void {
    this._income.update((list) =>
      list.map((i) => (i.id === updated.id ? updated : i))
    );
  }

  removeIncome(id: number): void {
    this.api.deleteIncome(id).subscribe({
      next: () => {
        this._income.update((list) => list.filter((i) => i.id !== id));
      }
    });
  }
}
