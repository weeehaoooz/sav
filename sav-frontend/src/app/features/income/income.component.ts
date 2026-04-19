import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, ModuleRegistry, ClientSideRowModelModule, TooltipModule, ValidationModule } from 'ag-grid-community';

import { StateService } from '../../shared/services/state.service';
import { ApiService } from '../../shared/services/api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { MetricCardComponent, MetricCardConfig } from '../../shared/components/metric-card/metric-card.component';
import { savGridTheme } from '../../shared/ag-grid-theme';
import { Income } from '../../shared/models/income.model';
import { ActionsCellRendererComponent } from '../../shared/components/actions-cell-renderer/actions-cell-renderer.component';
import { IncomeFormComponent } from './components/income-form/income-form.component';

ModuleRegistry.registerModules([ClientSideRowModelModule, TooltipModule, ValidationModule]);

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [
    CommonModule, MatSnackBarModule, AgGridModule,
    PageHeaderComponent, MetricCardComponent,
    IncomeFormComponent, ActionsCellRendererComponent
  ],
  templateUrl: './income.component.html',
  styleUrls: ['./income.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeComponent implements OnInit {
  readonly state = inject(StateService);
  private readonly api = inject(ApiService);
  private readonly snackbar = inject(MatSnackBar);

  readonly gridTheme = savGridTheme;

  readonly showForm = signal(false);
  readonly editingItem = signal<Income | null>(null);
  readonly saving = signal(false);

  ngOnInit(): void {
    // CPF fields are synced in StateService
  }

  readonly incomeTypes = [
    { value: 'salary', label: 'Full-time Employment' }
  ];

  readonly cpfRules = {
    '55': { employer: 17, employee: 20 },
    '56': { employer: 16, employee: 18 },
    '57': { employer: 16, employee: 18 },
    '58': { employer: 16, employee: 18 },
    '59': { employer: 16, employee: 18 },
    '60': { employer: 16, employee: 18 },
    '61': { employer: 12.5, employee: 12.5 },
    '62': { employer: 12.5, employee: 12.5 },
    '63': { employer: 12.5, employee: 12.5 },
    '64': { employer: 12.5, employee: 12.5 },
    '65': { employer: 9, employee: 7.5 },
    '66': { employer: 9, employee: 7.5 },
    '67': { employer: 9, employee: 7.5 },
    '68': { employer: 9, employee: 7.5 },
    '69': { employer: 9, employee: 7.5 },
    '70': { employer: 7.5, employee: 5 },
    '71': { employer: 7.5, employee: 5 },
    '72': { employer: 7.5, employee: 5 },
    '73': { employer: 7.5, employee: 5 },
    '74': { employer: 7.5, employee: 5 },
    '75': { employer: 7.5, employee: 5 },
    '76': { employer: 7.5, employee: 5 },
    '77': { employer: 7.5, employee: 5 },
    '78': { employer: 7.5, employee: 5 },
    '79': { employer: 7.5, employee: 5 },
    '80': { employer: 7.5, employee: 5 },
  };

  readonly colDefs: ColDef<Income>[] = [
    {
      field: 'name', headerName: 'Income Source', flex: 1.5, cellRenderer: (p: any) => `
      <div style="display:flex; align-items:center; gap:8px;">
        <span>${p.value}</span>
        ${p.data.has_cpf ? '<span style="font-size: 10px; background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;">CPF</span>' : ''}
      </div>
    `},
    { field: 'company', headerName: 'Company', flex: 1 },
    { field: 'income_type', headerName: 'Type', flex: 1, valueFormatter: p => this.incomeTypes.find(t => t.value === p.value)?.label ?? p.value },
    { field: 'account_name', headerName: 'Account', flex: 1 },
    { field: 'amount', headerName: 'Amount', flex: 1, type: 'rightAligned', valueFormatter: p => `SGD ${Number(p.value ?? 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { field: 'frequency', headerName: 'Frequency', flex: 0.8 },
    { field: 'monthly_equivalent', headerName: 'Monthly', flex: 1, type: 'rightAligned', cellStyle: { color: '#34d399' }, valueFormatter: p => `SGD ${Number(p.value ?? 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { field: 'take_home_amount', headerName: 'Take Home', flex: 1, type: 'rightAligned', cellStyle: { color: '#10b981' }, valueFormatter: p => `SGD ${Number(p.value ?? 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { field: 'additional_contributions', headerName: 'Employer CPF', flex: 1, type: 'rightAligned', cellStyle: { color: '#0ea5e9' }, valueFormatter: p => `SGD ${Number(p.value ?? 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    {
      headerName: 'Actions',
      flex: 0.8,
      sortable: false,
      cellRenderer: ActionsCellRendererComponent,
      cellRendererParams: {
        actions: [
          {
            icon: 'edit',
            tooltip: 'Edit Income Source',
            class: 'btn-edit',
            action: (p: any) => this.openEdit(p.data)
          },
          {
            icon: 'delete',
            tooltip: 'Delete Income Source',
            class: 'btn-delete',
            action: (p: any) => this.deleteItem(p.data.id)
          }
        ]
      }
    },
  ];

  readonly defaultColDef: ColDef = { sortable: true, resizable: true };

  readonly metrics = computed<MetricCardConfig[]>(() => [
    { label: 'Monthly Income', value: this.state.totalMonthlyIncome(), format: 'currency', icon: 'trending_up', accentColor: '#10b981' },
    { label: 'Annual Income', value: this.state.totalMonthlyIncome() * 12, format: 'currency', icon: 'savings', accentColor: '#06b6d4' },
    { label: 'Income Sources', value: this.state.income().length, format: 'number', icon: 'list', accentColor: '#6366f1' },
  ]);

  openCreate(): void {
    this.editingItem.set(null);
    this.showForm.set(true);
  }

  openEdit(item: Income): void {
    this.editingItem.set(item);
    this.showForm.set(true);
  }

  onSave(data: any): void {
    this.saving.set(true);
    const item = this.editingItem();
    const id = item?.id;
    const obs = id ? this.api.updateIncome(id, data) : this.api.createIncome(data);

    obs.subscribe({
      next: (newItem) => {
        if (id) this.state.updateIncome(newItem); else this.state.addIncome(newItem);
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
