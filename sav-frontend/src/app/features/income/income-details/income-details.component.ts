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
import { Income, Employment, Bonus, IncomeType } from '../../../shared/models/income.model';
import { savGridTheme } from '../../../shared/ag-grid-theme';
import { MetricCardConfig } from '../../../shared/components/metric-card/metric-card.component';
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
    AgGridModule, NgxEchartsModule, MatSnackBarModule, MatButtonModule, MatIconModule, MatTooltipModule
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

    const currency = 'SGD';
    const amount = Number(item.amount) || 0;
    
    const items: MetricCardConfig[] = [
      {
        label: 'Monthly Base',
        value: amount,
        format: 'currency',
        icon: 'payments',
        accentColor: '#6366f1',
        subtitle: `Regular monthly income`,
      }
    ];

    const emp = this.employment();
    if (emp) {
      const annualBase = amount * 12;
      const totalBonuses = (emp.bonuses || []).reduce((sum, b) => sum + Number(b.amount), 0);
      const totalAnnual = annualBase + totalBonuses;

      if (emp.has_cpf) {
        const selectedAcc = this.userService.selectedAccount();
        const age = this.cpfService.calculateAge(selectedAcc?.date_of_birth);
        
        // Monthly CPF
        const monthlyCpf = this.cpfService.calculateMonthlyCpf(amount, age);
        const takeHome = amount - monthlyCpf.employee;

        // Annual Bonus CPF
        const bonusCpf = this.cpfService.calculateBonusCpf(totalBonuses, age, annualBase);
        
        const totalEmployeeCpfAnnual = (monthlyCpf.employee * 12) + bonusCpf.employee;
        const totalEmployerCpfAnnual = (monthlyCpf.employer * 12) + bonusCpf.employer;
        const netAnnual = totalAnnual - totalEmployeeCpfAnnual;

        items.push(
          {
            label: 'Net Monthly',
            value: takeHome,
            format: 'currency',
            icon: 'account_balance_wallet',
            accentColor: '#ef4444',
            subtitle: `After $${monthlyCpf.employee} CPF contribution`,
          },
          {
            label: 'Annual Net',
            value: netAnnual,
            format: 'currency',
            icon: 'savings',
            accentColor: '#10b981',
            subtitle: 'Net base + net bonuses',
          },
          {
            label: 'Employer CPF',
            value: totalEmployerCpfAnnual,
            format: 'currency',
            icon: 'business',
            accentColor: '#8b5cf6',
            subtitle: `Annual employer contribution`,
          }
        );
      } else {
        items.push(
          {
            label: 'Annual Total',
            value: totalAnnual,
            format: 'currency',
            icon: 'calendar_today',
            accentColor: '#10b981',
            subtitle: 'Including base + bonuses',
          },
          {
            label: 'Total Bonuses',
            value: totalBonuses,
            format: 'currency',
            icon: 'redeem',
            accentColor: '#f59e0b',
            subtitle: `${emp.bonuses?.length || 0} bonus entries`,
          }
        );
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
    this.incomeForm = this.fb.group({
      name: [item?.name ?? '', Validators.required],
      amount: [item?.amount ?? null, [Validators.required, Validators.min(0)]],
      company: [item?.company ?? ''],
      has_cpf: [item?.has_cpf ?? false],
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

  updateChartOptions(income: Income, isDark: boolean): void {
    const months = this.monthLabels;
    const base = Number(income.amount) || 0;
    const emp = this.employment();
    
    // Create an array of 12 values, each base salary
    const values = Array(12).fill(base);
    
    // If employment, add bonuses to specific months
    if (emp) {
      emp.bonuses.forEach(b => {
        if (b.month >= 1 && b.month <= 12) {
          values[b.month - 1] += Number(b.amount);
        }
      });
    }

    const textColor = isDark ? '#94a3b8' : '#64748b';
    const splitLineColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    this.chartOptions.set({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        textStyle: { color: isDark ? '#f8fafc' : '#1e293b' },
        formatter: (params: any) => {
          const p = params[0];
          return `<div style="padding: 4px">
            <div style="font-size: 11px; margin-bottom: 4px; color: ${textColor}">${p.name}</div>
            <div style="font-weight: 600">SGD ${Number(p.value).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>`;
        }
      },
      grid: { left: '2%', right: '2%', bottom: '3%', top: '10%', containLabel: true },
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
      series: [{
        data: values,
        type: 'bar',
        barWidth: '60%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#6366f1' },
              { offset: 1, color: '#818cf8' }
            ]
          }
        }
      }]
    });
  }

  goBack(): void {
    this.location.back();
  }
}
