import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TaxService {
  /**
   * Singapore Resident Individual Income Tax Rates (YA 2024 onwards)
   * Chargeable Income | Rate (%) | Gross Tax Payable ($)
   * First 20,000      | 0        | 0
   * Next 10,000       | 2        | 200
   * First 30,000      | -        | 200
   * Next 10,000       | 3.5      | 350
   * First 40,000      | -        | 550
   * Next 40,000       | 7        | 2,800
   * First 80,000      | -        | 3,350
   * Next 40,000       | 11.5     | 4,600
   * First 120,000     | -        | 7,950
   * Next 40,000       | 15       | 6,000
   * First 160,000     | -        | 13,950
   * Next 40,000       | 18       | 7,200
   * First 200,000     | -        | 21,150
   * Next 40,000       | 19       | 7,600
   * First 240,000     | -        | 28,750
   * Next 40,000       | 19.5     | 7,800
   * First 280,000     | -        | 36,550
   * Next 40,000       | 20       | 8,000
   * First 320,000     | -        | 44,550
   * Next 180,000      | 22       | 39,600
   * First 500,000     | -        | 84,150
   * Next 500,000      | 23       | 115,000
   * First 1,000,000   | -        | 199,150
   * In excess of 1M   | 24       |
   */
  private readonly TAX_BRACKETS = [
    { limit: 20000, rate: 0.000 },
    { limit: 10000, rate: 0.020 },
    { limit: 10000, rate: 0.035 },
    { limit: 40000, rate: 0.070 },
    { limit: 40000, rate: 0.115 },
    { limit: 40000, rate: 0.150 },
    { limit: 40000, rate: 0.180 },
    { limit: 40000, rate: 0.190 },
    { limit: 40000, rate: 0.195 },
    { limit: 40000, rate: 0.200 },
    { limit: 180000, rate: 0.220 },
    { limit: 500000, rate: 0.230 },
    { limit: Infinity, rate: 0.240 }
  ];

  /**
   * Calculate the estimated annual income tax based on the chargeable income.
   * Chargeable income is typically Gross Income - CPF Contributions - Reliefs.
   *
   * @param chargeableIncome The income subject to tax (in SGD).
   * @returns The estimated tax payable.
   */
  calculateAnnualTax(chargeableIncome: number): number {
    if (!chargeableIncome || chargeableIncome <= 0) {
      return 0;
    }

    let remainingIncome = chargeableIncome;
    let totalTax = 0;

    for (const bracket of this.TAX_BRACKETS) {
      if (remainingIncome <= 0) {
        break;
      }

      const taxableAmountInBracket = Math.min(remainingIncome, bracket.limit);
      totalTax += taxableAmountInBracket * bracket.rate;
      remainingIncome -= taxableAmountInBracket;
    }

    return Math.round(totalTax);
  }
}
