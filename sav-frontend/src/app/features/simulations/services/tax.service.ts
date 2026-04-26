import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TaxBracket {
  limit: number | null;
  rate: number;
}

export interface TaxResult {
  assessable_income: number;
  total_reliefs: number;
  capped_reliefs: number;
  chargeable_income: number;
  tax_payable: number;
}

export interface TaxSimulationResult {
  base: TaxResult;
  simulated: TaxResult;
  tax_savings: number;
}

@Injectable({
  providedIn: 'root'
})
export class TaxService {
  private apiUrl = `http://localhost:8000/api/taxes`;

  constructor(private http: HttpClient) {}

  getBrackets(): Observable<TaxBracket[]> {
    return this.http.get<TaxBracket[]>(`${this.apiUrl}/brackets/`);
  }

  simulateTax(assessableIncome: number, baseReliefs: number[], additionalReliefs: number[]): Observable<TaxSimulationResult> {
    return this.http.post<TaxSimulationResult>(`${this.apiUrl}/simulate/`, {
      assessable_income: assessableIncome,
      base_reliefs: baseReliefs,
      additional_reliefs: additionalReliefs
    });
  }
}
