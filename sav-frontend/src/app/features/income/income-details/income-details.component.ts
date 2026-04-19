import { Component, inject, signal, OnInit, effect, untracked, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgGridModule } from 'ag-grid-angular';
import {
  ColDef, GridReadyEvent, GridApi, ModuleRegistry,
  ClientSideRowModelModule, TooltipModule,
  ValidationModule, CellStyleModule, CellValueChangedEvent
} from 'ag-grid-community';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';

import { trigger, transition, style, animate } from '@angular/animations';

import { ApiService } from '../../../shared/services/api.service';
import { IncomeService } from '../../../shared/services/income.service';
import { ThemeService } from '../../../shared/services/theme.service';
import { CpfService } from '../../../shared/services/cpf.service';
import { UserService } from '../../../shared/services/user.service';
import { TaxService } from '../../../shared/services/tax.service';
import { Income, Employment, Bonus, IncomeType } from '../../../shared/models/income.model';
import { savGridTheme } from '../../../shared/ag-grid-theme';
import { MetricCardComponent, MetricCardConfig } from '../../../shared/components/metric-card/metric-card.component';
import { ActionsCellRendererComponent, ActionCellRendererParams } from '../../../shared/components/actions-cell-renderer/actions-cell-renderer.component';
import { MetricCellRendererComponent } from '../../../shared/components/metric-cell-renderer/metric-cell-renderer.component';

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  TooltipModule,
  ValidationModule,
  CellStyleModule
]);

@Component({
  selector: 'app-income-details',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    AgGridModule, NgxEchartsModule, MatSnackBarModule, MatButtonModule, MatIconModule, MatTooltipModule,
    MetricCardComponent
  ],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts: () => import('echarts') }
    }
  ],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden', transform: 'translateY(-10px)' }),
        animate('250ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ height: '*', opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1, overflow: 'hidden' }),
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ height: 0, opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ],
  templateUrl: './income-details.component.html',
  styleUrls: ['./income-details.component.scss']
})
export class IncomeDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly api = inject(ApiService);
  private readonly incomeService = inject(IncomeService);
  private readonly fb = inject(FormBuilder);
  private readonly snackbar = inject(MatSnackBar);
  private readonly cpfService = inject(CpfService);
  private readonly userService = inject(UserService);
  private readonly taxService = inject(TaxService);
  protected readonly themeService = inject(ThemeService);

  private gridApi!: GridApi;
  readonly gridTheme = savGridTheme;

  readonly income = signal<Income | null>(null);
  readonly employment = computed<Employment | null>(() => {
    const item = this.income();
    return item?.income_type === 'employment' ? (item as unknown as Employment) : null;
  });

  readonly bonuses = computed<Bonus[]>(() => this.employment()?.bonuses || []);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly chartOptions = signal<EChartsOption>({});

  // ── Bonus Form ────────────────────────────────────────────────────────────
  readonly showAddForm = signal(false);
  entryForm!: FormGroup;
  readonly editingBonus = signal<Bonus | null>(null);
  
  // ── Income Details Form ──────────────────────────────────────────────────
  readonly showEditIncomeForm = signal(false);
  incomeForm!: FormGroup;
  readonly savingIncome = signal(false);

  readonly monthLabels = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  readonly metrics = computed<MetricCardConfig[]>(() => {
    const item = this.income();
    if (!item) return [];

    const amount = Number(item.amount) || 0;
    const emp = this.employment();
    const items: MetricCardConfig[] = [];

    // --- 1. Monthly Context (Gross & Net) ---
    items.push({
      label: 'Monthly Base',
      value: amount,
      format: 'currency',
      icon: 'payments',
      accentColor: '#6366f1',
      subtitle: `Primary monthly gross`,
    });

    const incomeAccId = item.account;
    const account = this.userService.accounts().find(a => a.id === Number(incomeAccId));
    const age = this.cpfService.calculateAge(account?.date_of_birth);

    // Calculate active months in the current year
    let activeMonths = 0;
    for (let m = 1; m <= 12; m++) {
      if (emp) {
        if (this.isMonthActive(m, emp.start_dt, emp.end_dt)) activeMonths++;
      } else {
        activeMonths = 12;
        break;
      }
    }

    const annualBase = amount * activeMonths;

    if (emp?.has_cpf) {
      const monthlyCpf = this.cpfService.calculateMonthlyCpf(amount, age);
      const takeHome = amount - monthlyCpf.employee;
      items.push({
        label: 'Take-home Monthly',
        value: takeHome,
        format: 'currency',
        icon: 'account_balance_wallet',
        accentColor: '#10b981',
        subtitle: `Take-home after $${monthlyCpf.employee} CPF`,
      });
    }

    // --- 2. Annual Context ---
    if (emp) {
      const totalBonuses = (emp.bonuses || [])
        .filter(b => this.isMonthActive(b.month, emp.start_dt, emp.end_dt))
        .reduce((sum, b) => sum + Number(b.amount), 0);

      const totalAnnualGross = annualBase + totalBonuses;

      if (totalBonuses > 0) {
        items.push({
          label: 'Total Bonuses',
          value: totalBonuses,
          format: 'currency',
          icon: 'redeem',
          accentColor: '#f59e0b',
          subtitle: `${emp.bonuses?.length || 0} scheduled entries`,
        });
      }

      items.push({
        label: 'Annual Gross',
        value: totalAnnualGross,
        format: 'currency',
        icon: 'analytics',
        accentColor: '#3b82f6',
        subtitle: `Total annual gross pay`,
      });

      let totalEmployeeCpfAnnual = 0;
      let totalEmployerCpfAnnual = 0;

      if (emp.has_cpf) {
        const bonusCpf = this.cpfService.calculateBonusCpf(totalBonuses, age, annualBase, 0, activeMonths);
        totalEmployeeCpfAnnual = (this.cpfService.calculateMonthlyCpf(amount, age).employee * activeMonths) + bonusCpf.employee;
        totalEmployerCpfAnnual = (this.cpfService.calculateMonthlyCpf(amount, age).employer * activeMonths) + bonusCpf.employer;
        const netAnnual = totalAnnualGross - totalEmployeeCpfAnnual;

        items.push({
          label: 'Effective Mo. Take-home',
          value: activeMonths > 0 ? netAnnual / activeMonths : 0,
          format: 'currency',
          icon: 'query_stats',
          accentColor: '#0d9488',
          subtitle: 'Average monthly take-home',
        });

        items.push({
          label: 'Total CPF Savings',
          value: totalEmployeeCpfAnnual + totalEmployerCpfAnnual,
          format: 'currency',
          icon: 'account_balance',
          accentColor: '#8b5cf6',
          subtitle: `Incl. $${totalEmployerCpfAnnual.toLocaleString()} employer contribution`,
        });
      } else {
        const bonusWeight = totalAnnualGross > 0 ? (totalBonuses / totalAnnualGross) * 100 : 0;
        items.push({
          label: 'Bonus Weight',
          value: bonusWeight,
          format: 'percent',
          icon: 'pie_chart',
          accentColor: '#ec4899',
          subtitle: `${bonusWeight.toFixed(1)}% from variable pay`,
        });
      }

      const chargeableIncome = totalAnnualGross - totalEmployeeCpfAnnual;
      const annualTax = this.taxService.calculateAnnualTax(chargeableIncome);

      items.push({
        label: 'Estim. Annual Tax',
        value: annualTax,
        format: 'currency',
        icon: 'receipt_long',
        accentColor: '#ef4444',
        subtitle: `Based on current income`,
      });

      if (annualTax > 0 && activeMonths > 0) {
        items.push({
          label: 'Mo. Tax Provision',
          value: annualTax / activeMonths,
          format: 'currency',
          icon: 'event_note',
          accentColor: '#f97316',
          subtitle: 'Suggested monthly set-aside',
        });
      }
    }

    return items;
  });

  readonly colDefs = computed<ColDef<Bonus>[]>(() => {
    return [
      {
        field: 'month',
        headerName: 'Month',
        flex: 1,
        valueFormatter: p => this.monthLabels[p.value - 1] || 'Unknown'
      },
      {
        field: 'amount',
        headerName: 'Amount',
        flex: 1.5,
        cellRenderer: MetricCellRendererComponent,
        cellRendererParams: {
          currency: 'SGD',
          weight: 500,
          fontSize: '13px',
          color: 'var(--text-primary)'
        }
      },
      {
        headerName: 'Actions',
        width: 100,
        suppressHeaderMenuButton: true,
        sortable: false,
        cellRenderer: ActionsCellRendererComponent,
        cellRendererParams: {
          actions: [
            {
              icon: 'edit',
              tooltip: 'Edit Bonus',
              class: 'btn-edit',
              action: (p: ActionCellRendererParams) => this.openEditBonus(p.data)
            },
            {
              icon: 'delete',
              tooltip: 'Delete Bonus',
              class: 'btn-delete',
              action: (p: ActionCellRendererParams) => this.deleteBonus(p.data)
            }
          ]
        } as ActionCellRendererParams
      }
    ];
  });

  constructor() {
    effect(() => {
      const data = this.income();
      const isDark = this.themeService.isDark();
      if (data) {
        untracked(() => this.updateChartOptions(data, isDark));
      }
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.loadIncome(Number(idParam));
    } else {
      this.goBack();
    }
    this.buildBonusForm();
    this.buildIncomeForm();
  }

  private buildIncomeForm(): void {
    const item = this.income();
    const emp = this.employment();
    
    const formatDate = (dateStr?: string | null) => {
      if (!dateStr) return '';
      return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    };
    
    this.incomeForm = this.fb.group({
      name: [item?.name ?? '', Validators.required],
      amount: [item?.amount ?? null, [Validators.required, Validators.min(0)]],
      company: [item?.company ?? ''],
      has_cpf: [item?.has_cpf ?? false],
      // Employment specific fields
      start_dt: [formatDate(emp?.start_dt), emp ? Validators.required : []],
      end_dt: [formatDate(emp?.end_dt)],
      average_growth_rate: [emp?.average_growth_rate ?? 0, [Validators.min(0), Validators.max(100)]]
    });
  }

  private buildBonusForm(prefill?: Partial<Bonus>): void {
    this.entryForm = this.fb.group({
      month: [prefill?.month ?? 1, [Validators.required, Validators.min(1), Validators.max(12)]],
      amount: [prefill?.amount ?? null, [Validators.required, Validators.min(0)]],
    });
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  loadIncome(id: number): void {
    this.loading.set(true);
    this.incomeService.getIncome(id).subscribe({
      next: (data) => {
        this.income.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.snackbar.open('Failed to load income details', 'Close', { duration: 3000 });
        this.goBack();
      }
    });
  }

  // ── Bonus Form Management ──────────────────────────────────────────────────

  toggleAddForm(): void {
    if (this.editingBonus()) {
      this.editingBonus.set(null);
      this.buildBonusForm();
      this.showAddForm.set(true);
    } else {
      this.showAddForm.update(v => !v);
      if (!this.showAddForm()) {
        this.buildBonusForm();
      }
    }
    
    // Close other forms
    if (this.showAddForm()) {
      this.showEditIncomeForm.set(false);
    }
  }

  toggleEditIncomeForm(): void {
    this.showEditIncomeForm.update(v => !v);
    if (this.showEditIncomeForm()) {
      this.buildIncomeForm();
      this.showAddForm.set(false);
      setTimeout(() => {
        document.querySelector('.edit-income-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }

  openEditBonus(bonus: Bonus): void {
    this.editingBonus.set(bonus);
    this.buildBonusForm(bonus);
    this.showAddForm.set(true);
    this.showEditIncomeForm.set(false);
    setTimeout(() => {
      document.querySelector('.add-entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  cancelForm(): void {
    this.showAddForm.set(false);
    this.editingBonus.set(null);
    this.buildBonusForm();
  }

  cancelEditIncome(): void {
    this.showEditIncomeForm.set(false);
    this.buildIncomeForm();
  }

  saveBonus(): void {
    if (this.entryForm.invalid) {
      this.entryForm.markAllAsTouched();
      return;
    }

    const emp = this.employment();
    if (!emp) return;

    this.saving.set(true);
    const raw = this.entryForm.value;
    const bonusData: Bonus = {
      month: Number(raw.month),
      amount: Number(raw.amount)
    };

    let updatedBonuses: Bonus[];
    const editBonus = this.editingBonus();

    if (editBonus) {
      // Find and replace by equality or id if available
      updatedBonuses = emp.bonuses.map(b => (b === editBonus || (b.id && b.id === editBonus.id)) ? bonusData : b);
    } else {
      updatedBonuses = [...emp.bonuses, bonusData];
    }

    this.api.updateIncome(emp.id, { bonuses: updatedBonuses } as any).subscribe({
      next: (updated) => {
        this.snackbar.open(editBonus ? 'Bonus updated' : 'Bonus added', 'Close', { duration: 2500 });
        this.income.set(updated);
        this.incomeService.updateIncome(updated); // Sync
        this.saving.set(false);
        this.cancelForm();
      },
      error: () => {
        this.snackbar.open('Failed to save bonus', 'Close', { duration: 3000 });
        this.saving.set(false);
      }
    });
  }

  saveIncomeDetails(): void {
    if (this.incomeForm.invalid) {
      this.incomeForm.markAllAsTouched();
      return;
    }

    const item = this.income();
    if (!item) return;

    this.savingIncome.set(true);
    const raw = this.incomeForm.value;
    
    const payload: any = {
      name: raw.name,
      amount: Number(raw.amount),
      has_cpf: raw.has_cpf
    };

    if (item.income_type === 'employment') {
      payload.monthly = Number(raw.amount); // Sync monthly with amount for employment
      payload.company = raw.company;
      payload.start_dt = raw.start_dt;
      payload.end_dt = raw.end_dt;
      payload.average_growth_rate = Number(raw.average_growth_rate);
    }

    this.api.updateIncome(item.id, payload).subscribe({
      next: (updated) => {
        this.snackbar.open('Income details updated', 'Close', { duration: 2500 });
        this.income.set(updated);
        this.incomeService.updateIncome(updated); // Sync with store
        this.savingIncome.set(false);
        this.showEditIncomeForm.set(false);
      },
      error: () => {
        this.snackbar.open('Failed to update income details', 'Close', { duration: 3000 });
        this.savingIncome.set(false);
      }
    });
  }

  deleteBonus(bonus: Bonus): void {
    if (!confirm('Are you sure you want to delete this bonus entry?')) return;

    const emp = this.employment();
    if (!emp) return;

    const updatedBonuses = emp.bonuses.filter(b => b !== bonus && b.id !== bonus.id);

    this.api.updateIncome(emp.id, { bonuses: updatedBonuses } as any).subscribe({
      next: (updated) => {
        this.snackbar.open('Bonus deleted', 'Close', { duration: 3000 });
        this.income.set(updated);
        this.incomeService.updateIncome(updated); // Sync
      },
      error: () => {
        this.snackbar.open('Failed to delete bonus', 'Close', { duration: 3000 });
      }
    });
  }

  private isMonthActive(month: number, startStr: string, endStr?: string | null): boolean {
    const year = new Date().getFullYear();
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : null;

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    if (monthEnd < start) return false;
    if (end && monthStart > end) return false;

    return true;
  }

  updateChartOptions(income: Income, isDark: boolean): void {
    const months = this.monthLabels;
    const base = Number(income.amount) || 0;
    const emp = this.employment();
    const hasCpf = income.has_cpf;

    // Data arrays for granular breakdown
    const takeHomeSalaryValues = Array(12).fill(0);
    const takeHomeBonusValues = Array(12).fill(0);
    const employeeCpfBaseValues = Array(12).fill(0);
    const employeeCpfBonusValues = Array(12).fill(0);
    const employerCpfBaseValues = Array(12).fill(0);
    const employerCpfBonusValues = Array(12).fill(0);

    const incomeAccId = income.account;
    const account = this.userService.accounts().find(a => a.id === Number(incomeAccId));
    const age = this.cpfService.calculateAge(account?.date_of_birth);

    // Calculate active months to get proper annual base for AW ceiling
    let activeMonths = 0;
    for (let i = 1; i <= 12; i++) {
      if (emp) {
        if (this.isMonthActive(i, emp.start_dt, emp.end_dt)) activeMonths++;
      } else {
        activeMonths = 12;
        break;
      }
    }
    const annualBase = base * activeMonths;

    let accumulatedAwSubjectToCpf = 0;

    for (let i = 0; i < 12; i++) {
      const monthNum = i + 1;
      const isActive = emp ? this.isMonthActive(monthNum, emp.start_dt, emp.end_dt) : true;

      if (!isActive) continue;

      let monthlyBonus = 0;
      if (emp) {
        monthlyBonus = emp.bonuses
          .filter(b => Number(b.month) === monthNum)
          .reduce((sum, b) => sum + Number(b.amount), 0);
      }

      if (hasCpf) {
        const monthlyCpf = this.cpfService.calculateMonthlyCpf(base, age);
        const bonusCpf = this.cpfService.calculateBonusCpf(monthlyBonus, age, annualBase, accumulatedAwSubjectToCpf, activeMonths);

        // Track cumulative bonus portion that was subject to CPF
        accumulatedAwSubjectToCpf += bonusCpf.subjectToCpf;

        employeeCpfBaseValues[i] = monthlyCpf.employee;
        employeeCpfBonusValues[i] = bonusCpf.employee;
        employerCpfBaseValues[i] = monthlyCpf.employer;
        employerCpfBonusValues[i] = bonusCpf.employer;

        takeHomeSalaryValues[i] = base - monthlyCpf.employee;
        takeHomeBonusValues[i] = monthlyBonus - bonusCpf.employee;
      } else {
        takeHomeSalaryValues[i] = base;
        takeHomeBonusValues[i] = monthlyBonus;
        employeeCpfBaseValues[i] = 0;
        employeeCpfBonusValues[i] = 0;
        employerCpfBaseValues[i] = 0;
        employerCpfBonusValues[i] = 0;
      }
    }

    const textColor = isDark ? '#94a3b8' : '#64748b';
    const splitLineColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    this.chartOptions.set({
      backgroundColor: 'transparent',
      legend: {
        show: true,
        bottom: 0,
        textStyle: { color: textColor, fontSize: 10 },
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        textStyle: { color: isDark ? '#f8fafc' : '#1e293b' },
        formatter: (params: any) => {
          let html = `<div style="padding: 4px; min-width: 180px;">
            <div style="font-size: 11px; margin-bottom: 8px; color: ${textColor}; border-bottom: 1px solid ${splitLineColor}; padding-bottom: 4px;">${params[0].name}</div>`;
          
          let totalValue = 0;
          params.slice().reverse().forEach((p: any) => {
            if (Math.abs(p.value) > 0.01) {
              totalValue += p.value;
              html += `<div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px">
                <span style="color: ${textColor}">${p.seriesName}</span>
                <span style="font-weight: 600; margin-left: 12px">SGD ${Number(p.value).toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>`;
            }
          });

          html += `<div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 4px; border-top: 1px solid ${splitLineColor}; font-size: 12px; font-weight: 700">
            <span>Total Value</span>
            <span>SGD ${totalValue.toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div></div>`;
          return html;
        }
      },
      grid: { left: '2%', right: '2%', bottom: '15%', top: '5%', containLabel: true },
      xAxis: {
        type: 'category',
        data: months.map(m => m.substring(0, 3)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: textColor, fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: splitLineColor } },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          formatter: (v: number) => (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v).toString()
        }
      },
      series: [
        {
          name: 'Take Home (Salary)',
          data: takeHomeSalaryValues,
          type: 'bar',
          stack: 'total',
          barWidth: '50%',
          itemStyle: { color: '#6366f1' }
        },
        {
          name: 'Take Home (Bonus)',
          data: takeHomeBonusValues,
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#f59e0b' }
        },
        {
          name: 'Employee CPF (Base)',
          data: employeeCpfBaseValues,
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#e11d48' }
        },
        {
          name: 'Employee CPF (Bonus)',
          data: employeeCpfBonusValues,
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#fb7185' }
        },
        {
          name: 'Employer CPF (Base)',
          data: employerCpfBaseValues,
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#7c3aed' }
        },
        {
          name: 'Employer CPF (Bonus)',
          data: employerCpfBonusValues,
          type: 'bar',
          stack: 'total',
          itemStyle: { 
            borderRadius: [4, 4, 0, 0],
            color: '#a78bfa' 
          }
        }
      ]
    });
  }

  goBack(): void {
    this.location.back();
  }
}

