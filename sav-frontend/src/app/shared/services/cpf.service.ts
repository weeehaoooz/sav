import { Injectable } from '@angular/core';

export interface CpfRates {
  employee: number;
  employer: number;
}

@Injectable({
  providedIn: 'root'
})
export class CpfService {
  /**
   * Statutory ceilings for 2026
   */
  private readonly OW_CEILING = 8000;
  private readonly AW_ANNUAL_LIMIT = 102000;

  /**
   * Returns (employee_rate, employer_rate) based on age for 2026.
   * Based on statutory rates from 1 January 2026.
   */
  getRates(age: number): CpfRates {
    if (age <= 55) {
      return { employee: 0.20, employer: 0.17 };
    } else if (age <= 60) {
      return { employee: 0.18, employer: 0.16 };
    } else if (age <= 65) {
      return { employee: 0.125, employer: 0.125 };
    } else if (age <= 70) {
      return { employee: 0.075, employer: 0.09 };
    } else {
      return { employee: 0.05, employer: 0.075 };
    }
  }

  /**
   * Calculate monthly CPF contributions
   */
  calculateMonthlyCpf(monthlySalary: number, age: number): { employee: number, employer: number, total: number } {
    if (!monthlySalary || monthlySalary <= 0) {
      return { employee: 0, employer: 0, total: 0 };
    }

    const { employee: employeeRate, employer: employerRate } = this.getRates(age);
    const subjectToCpf = Math.min(monthlySalary, this.OW_CEILING);

    const employeeCpf = Math.round(subjectToCpf * employeeRate);
    const employerCpf = Math.round(subjectToCpf * employerRate);

    return {
      employee: employeeCpf,
      employer: employerCpf,
      total: employeeCpf + employerCpf
    };
  }

  /**
   * Calculate bonus CPF contributions factoring in AW ceiling and previously accumulated bonuses
   */
  calculateBonusCpf(
    bonusAmount: number,
    age: number,
    annualSalary: number,
    accumulatedAwSubjectToCpf: number = 0,
    activeMonths: number = 12
  ): { employee: number, employer: number, subjectToCpf: number } {
    if (!bonusAmount || bonusAmount <= 0) {
      return { employee: 0, employer: 0, subjectToCpf: 0 };
    }

    // OW subject to CPF capped at ceiling per month proportional to active months
    const annualOwSubjectToCpf = Math.min(annualSalary, this.OW_CEILING * activeMonths);
    const totalAwCeiling = Math.max(0, this.AW_ANNUAL_LIMIT - annualOwSubjectToCpf);
    
    // Remaining ceiling after previous bonuses in the same year
    const remainingCeiling = Math.max(0, totalAwCeiling - accumulatedAwSubjectToCpf);
    const subjectToCpf = Math.min(bonusAmount, remainingCeiling);

    const { employee: employeeRate, employer: employerRate } = this.getRates(age);

    return {
      employee: Math.round(subjectToCpf * employeeRate),
      employer: Math.round(subjectToCpf * employerRate),
      subjectToCpf: subjectToCpf
    };
  }

  /**
   * Helper to calculate age from DOB string
   */
  calculateAge(dob: string | null | undefined): number {
    if (!dob) return 30; // Default age if not provided
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}
