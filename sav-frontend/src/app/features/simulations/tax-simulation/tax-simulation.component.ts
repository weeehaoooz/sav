import { Component, OnInit, computed, effect, inject, signal, untracked, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaxService, TaxBracket, TaxSimulationResult } from '../services/tax.service';
import { Subject, switchMap, tap, timer, debounce, catchError, of, EMPTY } from 'rxjs';
import { IncomeService } from '../../../shared/services/income.service';
import { ApiService } from '../../../shared/services/api.service';
import { UserService } from '../../../shared/services/user.service';
import { Account } from '../../../shared/models/account.model';
import { ThemeService } from '../../../shared/services/theme.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { MetricCardComponent, MetricCardConfig } from '../../../shared/components/metric-card/metric-card.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-tax-simulation',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, MetricCardComponent, MatIconModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './tax-simulation.component.html',
  styleUrls: ['./tax-simulation.component.scss']
})
export class TaxSimulationComponent implements OnInit {
  brackets: TaxBracket[] = [];
  result: TaxSimulationResult | null = null;
  loading = false;
  error = '';
  private simulationTrigger$ = new Subject<boolean>();
  private destroyRef = inject(DestroyRef);

  // Selection state
  readonly selectedIncomeIds = signal<Set<number>>(new Set());

  // Filtered incomes for selected profile
  readonly profileIncomes = computed(() => {
    const account = this.simulationAccount();
    if (!account) return [];
    return this.incomeService.income().filter(i => i.account === account.id);
  });

  // Inputs
  assessableIncome = 0;
  baseReliefs = [1000, 0]; // [Earned Income Relief, CPF Relief]

  // Simulation Inputs
  srsContribution = 0;
  cpfCashTopUp = 0;
  spouseRelief = false;
  childReliefs = 0;

  private taxService = inject(TaxService);
  private incomeService = inject(IncomeService);
  private apiService = inject(ApiService);
  private snackbar = inject(MatSnackBar);
  public userService = inject(UserService);
  public themeService = inject(ThemeService);

  readonly simulationAccount = signal<Account | null>(null);

  // Quick add income form state
  readonly isAddingIncome = signal(false);
  readonly savingIncome = signal(false);
  quickIncomeName = '';
  quickIncomeAmount: number | null = null;

  readonly metrics = computed<MetricCardConfig[]>(() => {
    if (!this.result) return [];
    return [
      {
        label: 'Assessable Income',
        value: this.result.simulated.assessable_income,
        format: 'currency',
        icon: 'payments',
        accentColor: 'var(--accent-indigo)'
      },
      {
        label: 'Taxable Income',
        value: this.result.simulated.chargeable_income,
        format: 'currency',
        icon: 'account_balance_wallet',
        accentColor: 'var(--accent-cyan)'
      },
      {
        label: 'Est. Tax Payable',
        value: this.result.simulated.tax_payable,
        format: 'currency',
        icon: 'receipt_long',
        accentColor: 'var(--accent-rose)'
      },
      {
        label: 'Tax Savings',
        value: this.result.tax_savings,
        format: 'currency',
        icon: 'savings',
        accentColor: 'var(--accent-emerald)'
      }
    ];
  });

  constructor() {
    // Initialize simulation account from global state if not already set
    effect(() => {
      const globalAccount = this.userService.selectedAccount();
      if (!untracked(this.simulationAccount) && globalAccount) {
        this.simulationAccount.set(globalAccount);
      }
    }, { allowSignalWrites: true });

    // Reset selection when account changes or incomes change
    effect(() => {
      const incomes = this.profileIncomes();
      // Only reset if we haven't initialized for this set of incomes yet
      // This is a bit tricky with Sets. We'll just reset when the set of IDs changes significantly.
      untracked(() => {
        const currentIds = this.selectedIncomeIds();
        const newIds = new Set(incomes.map(i => i.id));

        // Simple heuristic: if sizes are different or one doesn't exist in the other
        if (currentIds.size === 0 || [...newIds].some(id => !currentIds.has(id))) {
          this.selectedIncomeIds.set(newIds);
        }
      });
    }, { allowSignalWrites: true });

    effect(() => {
      const incomes = this.profileIncomes();
      const selectedIds = this.selectedIncomeIds();
      const account = this.simulationAccount();

      if (account) {
        const filteredIncomes = incomes.filter(i => selectedIds.has(i.id));

        // Calculate annual assessable income
        const monthlyGross = filteredIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        this.assessableIncome = monthlyGross * 12;

        // Estimate CPF Relief (20% of OW up to ceiling of 6800 per month for 2024 onwards)
        const monthlySubjectToCpf = Math.min(monthlyGross, 6800);
        const annualCpfRelief = monthlySubjectToCpf * 0.20 * 12;

        // Estimate Earned Income Relief based on age
        let earnedIncomeRelief = 1000;
        if (account.date_of_birth) {
          const birthYear = new Date(account.date_of_birth).getFullYear();
          const age = new Date().getFullYear() - birthYear;
          if (age >= 60) earnedIncomeRelief = 8000;
          else if (age >= 55) earnedIncomeRelief = 6000;
        }

        this.baseReliefs = [earnedIncomeRelief, annualCpfRelief];
        // Account changes should be instant
        this.simulate(true);
      }
    });

    this.setupSimulationPipeline();
  }

  private setupSimulationPipeline(): void {
    this.simulationTrigger$.pipe(
      tap(() => {
        this.loading = true;
        this.error = '';
      }),
      debounce(immediate => immediate ? of(null) : timer(200)),
      switchMap(() => {
        const childReliefAmount = this.childReliefs * 4000;
        const additionalReliefs = [
          this.srsContribution,
          this.cpfCashTopUp,
          this.spouseRelief ? 2000 : 0,
          childReliefAmount
        ];
        return this.taxService.simulateTax(this.assessableIncome, this.baseReliefs, additionalReliefs).pipe(
          catchError(err => {
            console.error('Tax simulation failed:', err);
            this.error = 'Simulation failed.';
            this.loading = false;
            return EMPTY;
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (data) => {
        this.result = data;
        this.loading = false;
      }
    });
  }

  ngOnInit(): void {
    this.loadBrackets();
    // Incomes might already be loaded by global layout, but we can trigger it
    if (this.incomeService.income().length === 0) {
      this.incomeService.loadIncome();
    }
  }

  selectAccount(account: Account): void {
    this.simulationAccount.set(account);
  }

  getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  loadBrackets(): void {
    this.taxService.getBrackets().subscribe({
      next: (data) => this.brackets = data,
      error: (err) => console.error('Failed to load brackets', err)
    });
  }

  toggleIncome(id: number): void {
    const current = new Set(this.selectedIncomeIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedIncomeIds.set(current);
  }

  simulate(immediate = false): void {
    if (this.assessableIncome <= 0) {
      this.result = null;
      this.loading = false;
      return;
    }

    this.loading = true;
    this.simulationTrigger$.next(immediate);
  }

  deleteIncome(id: number, event: MouseEvent): void {
    event.stopPropagation();
    this.incomeService.removeIncome(id);
    this.snackbar.open('Income source removed', 'Close', { duration: 3000 });
  }

  openQuickAdd(): void {
    this.quickIncomeName = '';
    this.quickIncomeAmount = null;
    this.isAddingIncome.set(true);
  }

  cancelQuickAdd(): void {
    this.isAddingIncome.set(false);
    this.quickIncomeName = '';
    this.quickIncomeAmount = null;
  }

  saveQuickIncome(): void {
    const account = this.simulationAccount();
    if (!account || !this.quickIncomeName.trim() || !this.quickIncomeAmount || this.quickIncomeAmount <= 0) return;

    this.savingIncome.set(true);
    this.apiService.createIncome({
      name: this.quickIncomeName.trim(),
      amount: this.quickIncomeAmount,
      account: account.id,
      income_type: 'employment',
      has_cpf: true,
      is_active: true,
      notes: 'Added via Tax Simulation'
    }).subscribe({
      next: (newIncome) => {
        this.incomeService.addIncome(newIncome);
        this.savingIncome.set(false);
        this.isAddingIncome.set(false);
        this.quickIncomeName = '';
        this.quickIncomeAmount = null;
        this.snackbar.open('Income source added', 'Close', { duration: 3000 });
      },
      error: () => {
        this.savingIncome.set(false);
        this.snackbar.open('Failed to add income source', 'Close', { duration: 3000 });
      }
    });
  }
}
