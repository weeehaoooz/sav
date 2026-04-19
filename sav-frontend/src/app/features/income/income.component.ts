import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, ModuleRegistry, ClientSideRowModelModule, TooltipModule, ValidationModule } from 'ag-grid-community';

import { IncomeService } from '../../shared/services/income.service';
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
    IncomeFormComponent
  ],
  templateUrl: './income.component.html',
  styleUrls: ['./income.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeComponent implements OnInit {
  readonly incomeService = inject(IncomeService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly snackbar = inject(MatSnackBar);

  readonly gridTheme = savGridTheme;

  readonly showForm = signal(false);
  readonly editingItem = signal<Income | null>(null);
  readonly saving = signal(false);

  ngOnInit(): void {
    this.incomeService.loadIncome();
  }

  readonly incomeTypes = [
    { value: 'employment', label: 'Full-time Employment' }
  ];

  readonly colDefs: ColDef<Income>[] = [
    { field: 'name', headerName: 'Income Source', flex: 1.5 },
    { field: 'company', headerName: 'Company', flex: 1 },
    { field: 'income_type', headerName: 'Type', flex: 1, valueFormatter: p => this.incomeTypes.find(t => t.value === p.value)?.label ?? p.value },
    { field: 'amount', headerName: 'Amount', flex: 1, type: 'rightAligned', valueFormatter: p => `SGD ${Number(p.value ?? 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    {
      headerName: 'Actions',
      flex: 0.8,
      sortable: false,
      cellRenderer: ActionsCellRendererComponent,
      cellRendererParams: {
        actions: [
          {
            icon: 'visibility',
            tooltip: 'View Details',
            class: 'btn-view',
            action: (p: any) => this.router.navigate(['/income', p.data.id])
          },
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
    { label: 'Income Sources', value: this.incomeService.income().length, format: 'number', icon: 'list', accentColor: '#6366f1' },
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
        if (id) this.incomeService.updateIncome(newItem); else this.incomeService.addIncome(newItem);
        this.showForm.set(false);
        this.saving.set(false);
        this.snackbar.open(id ? 'Updated' : 'Added', 'Close', { duration: 3000 });
      },
      error: () => this.saving.set(false),
    });
  }

  deleteItem(id: number): void {
    this.api.deleteIncome(id).subscribe({ next: () => { this.incomeService.removeIncome(id); } });
  }

  cancelForm(): void { this.showForm.set(false); }

}
