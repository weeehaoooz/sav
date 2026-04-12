import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Account } from '../models/account.model';
import { Asset } from '../models/asset.model';
import { Liability } from '../models/liability.model';
import { Income } from '../models/income.model';
import { Expense } from '../models/expense.model';
import { DashboardSummary } from '../models/dashboard.model';


/**
 * Global application state using Angular Signals.
 * Acts as a single reactive store across all feature components.
 */
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class StateService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.loadAll();
    }
  }

  // ── Assets ────────────────────────────────────────────────────────────────
  private _assets = signal<Asset[]>([]);
  readonly assets = this._assets.asReadonly();

  readonly totalAssetValue = computed(() =>
    this._assets().reduce((sum, a) => sum + a.current_value, 0)
  );

  readonly assetsByType = computed(() => {
    const grouped: Record<string, Asset[]> = {};
    for (const asset of this._assets()) {
      (grouped[asset.asset_type] ??= []).push(asset);
    }
    return grouped;
  });

  // ── Liabilities ───────────────────────────────────────────────────────────
  private _liabilities = signal<Liability[]>([]);
  readonly liabilities = this._liabilities.asReadonly();

  readonly totalLiabilityValue = computed(() =>
    this._liabilities().reduce((sum, l) => sum + l.outstanding_balance, 0)
  );

  // ── Income ────────────────────────────────────────────────────────────────
  private _income = signal<Income[]>([]);
  readonly income = this._income.asReadonly();

  readonly totalMonthlyIncome = computed(() =>
    this._income().filter(i => i.is_active).reduce((sum, i) => sum + i.monthly_equivalent, 0)
  );

  // ── Expenses ──────────────────────────────────────────────────────────────
  private _expenses = signal<Expense[]>([]);
  readonly expenses = this._expenses.asReadonly();

  readonly totalMonthlyExpenses = computed(() =>
    this._expenses().filter(e => e.is_active).reduce((sum, e) => sum + e.monthly_equivalent, 0)
  );

  // ── Dashboard ─────────────────────────────────────────────────────────────
  private _dashboard = signal<DashboardSummary | null>(null);
  readonly dashboard = this._dashboard.asReadonly();

  // ── Loading ───────────────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  readonly netWorth = computed(() => this.totalAssetValue() - this.totalLiabilityValue());
  readonly monthlyCashFlow = computed(() => this.totalMonthlyIncome() - this.totalMonthlyExpenses());

  // ── Loaders ───────────────────────────────────────────────────────────────
  loadAll(): void {
    this.loading.set(true);
    this.api.getAssets().subscribe(data => this._assets.set(data));
    this.api.getLiabilities().subscribe(data => this._liabilities.set(data));
    this.api.getIncome().subscribe(data => this._income.set(data));
    this.api.getExpenses().subscribe(data => this._expenses.set(data));
    this.api.getDashboardSummary().subscribe({
      next: data => {
        this._dashboard.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ── Mutations — Assets ─────────────────────────────────────────────────
  addAsset(asset: Asset): void {
    this._assets.update(list => [asset, ...list]);
  }
  updateAsset(updated: Asset): void {
    this._assets.update(list => list.map(a => a.id === updated.id ? updated : a));
  }
  removeAsset(id: number): void {
    this._assets.update(list => list.filter(a => a.id !== id));
  }

  // ── Mutations — Liabilities ────────────────────────────────────────────
  addLiability(l: Liability): void {
    this._liabilities.update(list => [l, ...list]);
  }
  updateLiability(updated: Liability): void {
    this._liabilities.update(list => list.map(l => l.id === updated.id ? updated : l));
  }
  removeLiability(id: number): void {
    this._liabilities.update(list => list.filter(l => l.id !== id));
  }

  // ── Mutations — Income ────────────────────────────────────────────────
  addIncome(item: Income): void {
    this._income.update(list => [item, ...list]);
  }
  updateIncome(updated: Income): void {
    this._income.update(list => list.map(i => i.id === updated.id ? updated : i));
  }
  removeIncome(id: number): void {
    this._income.update(list => list.filter(i => i.id !== id));
  }

  // ── Mutations — Expenses ──────────────────────────────────────────────
  addExpense(item: Expense): void {
    this._expenses.update(list => [item, ...list]);
  }
  updateExpense(updated: Expense): void {
    this._expenses.update(list => list.map(e => e.id === updated.id ? updated : e));
  }
  removeExpense(id: number): void {
    this._expenses.update(list => list.filter(e => e.id !== id));
  }
}
