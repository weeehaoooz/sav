import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Expense } from '../models/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly api = inject(ApiService);

  private readonly _expenses = signal<Expense[]>([]);
  readonly expenses = this._expenses.asReadonly();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly totalMonthlyExpenses = computed(() =>
    this._expenses()
      .filter((e) => e.is_active)
      .reduce((sum, e) => sum + (Number(e.monthly_equivalent) || 0), 0)
  );

  loadExpenses(): void {
    this.loading.set(true);
    this.api.getExpenses().subscribe({
      next: (data) => {
        this._expenses.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load expenses');
        this.loading.set(false);
      },
    });
  }

  addExpense(item: Expense): void {
    this._expenses.update((list) => [item, ...list]);
  }

  updateExpense(updated: Expense): void {
    this._expenses.update((list) =>
      list.map((e) => (e.id === updated.id ? updated : e))
    );
  }

  removeExpense(id: number): void {
    this._expenses.update((list) => list.filter((e) => e.id !== id));
  }
}
