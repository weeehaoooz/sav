import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { User } from '../models/user.model';
import { Account } from '../models/account.model';
import { Asset } from '../models/asset.model';
import { Liability } from '../models/liability.model';
import { Income } from '../models/income.model';
import { Expense } from '../models/expense.model';
import { DashboardSummary } from '../models/dashboard.model';
import { RetirementResult, AmortisationPeriod } from '../models/simulation.model';


@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = 'http://localhost:8000/api';

  // ── Users ────────────────────────────────────────────────────────────────
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/users/`);
  }

  // ── Accounts ─────────────────────────────────────────────────────────────
  getAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.base}/accounts/`);
  }
  createAccount(data: Partial<Account>): Observable<Account> {
    return this.http.post<Account>(`${this.base}/accounts/`, data);
  }
  updateAccount(id: number, data: Partial<Account>): Observable<Account> {
    return this.http.patch<Account>(`${this.base}/accounts/${id}/`, data);
  }
  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/accounts/${id}/`);
  }

  // ── Assets ────────────────────────────────────────────────────────────────
  getAssets(): Observable<Asset[]> {
    return this.http.get<Asset[]>(`${this.base}/assets/`);
  }
  createAsset(data: Partial<Asset>): Observable<Asset> {
    return this.http.post<Asset>(`${this.base}/assets/`, data);
  }
  updateAsset(id: number, data: Partial<Asset>): Observable<Asset> {
    return this.http.patch<Asset>(`${this.base}/assets/${id}/`, data);
  }
  deleteAsset(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/assets/${id}/`);
  }

  // ── Liabilities ───────────────────────────────────────────────────────────
  getLiabilities(): Observable<Liability[]> {
    return this.http.get<Liability[]>(`${this.base}/liabilities/`);
  }
  createLiability(data: Partial<Liability>): Observable<Liability> {
    return this.http.post<Liability>(`${this.base}/liabilities/`, data);
  }
  updateLiability(id: number, data: Partial<Liability>): Observable<Liability> {
    return this.http.patch<Liability>(`${this.base}/liabilities/${id}/`, data);
  }
  deleteLiability(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/liabilities/${id}/`);
  }
  getAmortisation(id: number): Observable<{ schedule: AmortisationPeriod[]; total_periods: number }> {
    return this.http.get<any>(`${this.base}/liabilities/${id}/amortisation/`);
  }

  // ── Income ────────────────────────────────────────────────────────────────
  getIncome(): Observable<Income[]> {
    return this.http.get<Income[]>(`${this.base}/income/`);
  }
  createIncome(data: Partial<Income>): Observable<Income> {
    return this.http.post<Income>(`${this.base}/income/`, data);
  }
  updateIncome(id: number, data: Partial<Income>): Observable<Income> {
    return this.http.patch<Income>(`${this.base}/income/${id}/`, data);
  }
  deleteIncome(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/income/${id}/`);
  }

  // ── Expenses ──────────────────────────────────────────────────────────────
  getExpenses(): Observable<Expense[]> {
    return this.http.get<Expense[]>(`${this.base}/expenses/`);
  }
  createExpense(data: Partial<Expense>): Observable<Expense> {
    return this.http.post<Expense>(`${this.base}/expenses/`, data);
  }
  updateExpense(id: number, data: Partial<Expense>): Observable<Expense> {
    return this.http.patch<Expense>(`${this.base}/expenses/${id}/`, data);
  }
  deleteExpense(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/expenses/${id}/`);
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  getDashboardSummary(userId?: number): Observable<DashboardSummary> {
    let params = new HttpParams();
    if (userId) params = params.set('user_id', userId);
    return this.http.get<DashboardSummary>(`${this.base}/dashboard/summary/`, { params });
  }

  // ── Simulations ───────────────────────────────────────────────────────────
  runRetirementSimulation(params: Record<string, number>): Observable<RetirementResult> {
    return this.http.post<RetirementResult>(`${this.base}/simulations/run/retirement/`, params);
  }
}
