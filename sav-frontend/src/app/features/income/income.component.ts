import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, ModuleRegistry, ClientSideRowModelModule } from 'ag-grid-community';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

import { StateService } from '../../shared/services/state.service';
import { ApiService } from '../../shared/services/api.service';
import { ThemeService } from '../../shared/services/theme.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { MetricCardComponent, MetricCardConfig } from '../../shared/components/metric-card/metric-card.component';
import { savGridTheme } from '../../shared/ag-grid-theme';
import { Income, IncomeType, Frequency } from '../../shared/models/income.model';

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatSnackBarModule, AgGridModule,
    PageHeaderComponent, MetricCardComponent,
  ],
  templateUrl: './income.component.html',
  styleUrls: ['./income.component.scss'],
})
export class IncomeComponent {
  readonly state = inject(StateService);
  private readonly api = inject(ApiService);
  private readonly themeService = inject(ThemeService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly gridTheme = savGridTheme;

  readonly showForm = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);

  readonly incomeTypes: { value: IncomeType; label: string }[] = [
    { value: 'salary', label: 'Salary' },
    { value: 'bonus', label: 'Bonus' },
    { value: 'dividends', label: 'Dividends' },
    { value: 'rental', label: 'Rental Income' },
    { value: 'side_income', label: 'Side Income' },
    { value: 'cpf_contribution', label: 'CPF Contribution' },
    { value: 'other', label: 'Other' },
  ];

  readonly frequencies: { value: Frequency; label: string }[] = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' },
    { value: 'one_off', label: 'One-off' },
  ];

  readonly incomeForm = this.fb.group({
    name: ['', Validators.required],
    account: [null as number | null],
    income_type: ['salary' as IncomeType, Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
    frequency: ['monthly' as Frequency, Validators.required],
    growth_rate: [0.03],
    volatility: [0],
    notes: [''],
  });

  readonly colDefs: ColDef<Income>[] = [
    { field: 'name', headerName: 'Income Source', flex: 2 },
    { field: 'income_type', headerName: 'Type', flex: 1, valueFormatter: p => this.incomeTypes.find(t => t.value === p.value)?.label ?? p.value },
    { field: 'account_name', headerName: 'Account', flex: 1 },
    { field: 'amount', headerName: 'Amount', flex: 1, type: 'rightAligned', valueFormatter: p => `SGD ${(p.value ?? 0).toLocaleString()}` },
    { field: 'frequency', headerName: 'Frequency', flex: 1 },
    { field: 'monthly_equivalent', headerName: 'Monthly', flex: 1, type: 'rightAligned', cellStyle: { color: '#34d399' }, valueFormatter: p => `SGD ${(p.value ?? 0).toLocaleString('en-SG', { maximumFractionDigits: 0 })}` },
    {
      headerName: 'Actions', flex: 0.8, sortable: false,
      cellRenderer: (p: any) => `
        <div style="display:flex;gap:4px;align-items:center;height:100%">
          <button id="edit-${p.data.id}" style="background:rgba(99,102,241,0.12);border:none;color:#818cf8;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px">Edit</button>
          <button id="del-${p.data.id}" style="background:rgba(244,63,94,0.1);border:none;color:#fb7185;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px">Delete</button>
        </div>`,
      onCellClicked: (p) => {
        const id = (p.event?.target as HTMLElement)?.id;
        if (id?.startsWith('edit-') && p.data) this.openEdit(p.data);
        if (id?.startsWith('del-') && p.data) this.deleteItem(p.data.id);
      },
    },
  ];

  readonly defaultColDef: ColDef = { sortable: true, resizable: true };

  readonly metrics = computed<MetricCardConfig[]>(() => [
    { label: 'Monthly Income', value: this.state.totalMonthlyIncome(), format: 'currency', icon: 'trending_up', accentColor: '#10b981' },
    { label: 'Annual Income', value: this.state.totalMonthlyIncome() * 12, format: 'currency', icon: 'savings', accentColor: '#06b6d4' },
    { label: 'Income Sources', value: this.state.income().length, format: 'number', icon: 'list', accentColor: '#6366f1' },
  ]);

  openCreate(): void {
    this.editingId.set(null);
    this.incomeForm.reset({ income_type: 'salary', frequency: 'monthly', growth_rate: 0.03 });
    this.showForm.set(true);
  }

  openEdit(item: Income): void {
    this.editingId.set(item.id);
    this.incomeForm.patchValue({ ...item, account: item.account as unknown as number });
    this.showForm.set(true);
  }

  save(): void {
    if (this.incomeForm.invalid) return;
    this.saving.set(true);
    const data = this.incomeForm.value as any;
    const id = this.editingId();
    const obs = id ? this.api.updateIncome(id, data) : this.api.createIncome(data);
    obs.subscribe({
      next: (item) => {
        if (id) this.state.updateIncome(item); else this.state.addIncome(item);
        this.showForm.set(false);
        this.saving.set(false);
        this.snackbar.open(id ? 'Updated' : 'Added', 'Close', { duration: 3000 });
      },
      error: () => this.saving.set(false),
    });
  }

  deleteItem(id: number): void {
    this.api.deleteIncome(id).subscribe({ next: () => { this.state.removeIncome(id); } });
  }

  cancelForm(): void { this.showForm.set(false); }
}
