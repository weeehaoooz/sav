import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Account } from '../models/account.model';
import { Asset } from '../models/asset.model';
import { Income } from '../models/income.model';
import { Expense } from '../models/expense.model';
import { DashboardSummary } from '../models/dashboard.model';


/**
 * Global application state using Angular Signals.
 * Acts as a single reactive store across all feature components.
 */
import { AuthService } from './auth.service';
import { AssetService } from './asset.service';
import { LiabilityService } from './liability.service';

@Injectable({ providedIn: 'root' })
export class StateService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly assetService = inject(AssetService);
  private readonly liabilityService = inject(LiabilityService);

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.loadAll();
    }
  }

  // ── Assets (Delegated to AssetService) ──────────────────────────────────
  readonly assets = this.assetService.assets;
  readonly totalAssetValue = this.assetService.totalAssetValue;
  readonly assetsByType = this.assetService.assetsByType;

  // ── Income ────────────────────────────────────────────────────────────────
  private _income = signal<Income[]>([]);
  readonly income = this._income.asReadonly();

  readonly totalMonthlyIncome = computed(() =>
    this._income().filter(i => i.is_active).reduce((sum, i) => sum + (Number(i.monthly_equivalent) || 0), 0)
  );

  // ── Expenses ──────────────────────────────────────────────────────────────
  private _expenses = signal<Expense[]>([]);
  readonly expenses = this._expenses.asReadonly();

  readonly totalMonthlyExpenses = computed(() =>
    this._expenses().filter(e => e.is_active).reduce((sum, e) => sum + (Number(e.monthly_equivalent) || 0), 0)
  );

  // ── Dashboard ─────────────────────────────────────────────────────────────
  private _dashboard = signal<DashboardSummary | null>(null);
  readonly dashboard = this._dashboard.asReadonly();

  // ── Loading ───────────────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  readonly monthlyCashFlow = computed(() => this.totalMonthlyIncome() - this.totalMonthlyExpenses());

  // ── Loaders ───────────────────────────────────────────────────────────────
  loadAll(): void {
    this.loading.set(true);
    this.assetService.loadAssets();
    this.liabilityService.loadLiabilities();
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

  // These are now handled in AssetService directly by feature components.
  // We keep them here temporarily as proxies if needed, but better to call AssetService.
  addAsset(asset: Asset): void { this.assetService.addAsset(asset); }
  updateAsset(updated: Asset): void { this.assetService.updateAsset(updated); }
  removeAsset(id: number): void { this.assetService.removeAsset(id); }

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
