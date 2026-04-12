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
import { ColDef, GridReadyEvent, GridApi, ModuleRegistry, ClientSideRowModelModule, TooltipModule, ValidationModule, CellStyleModule } from 'ag-grid-community';

ModuleRegistry.registerModules([ClientSideRowModelModule, CellStyleModule, TooltipModule, ValidationModule]);

import { LiabilityService } from '../../shared/services/liability.service';
import { ApiService } from '../../shared/services/api.service';
import { ThemeService } from '../../shared/services/theme.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { MetricCardComponent, MetricCardConfig } from '../../shared/components/metric-card/metric-card.component';
import { ChartCardComponent } from '../../shared/components/chart-card/chart-card.component';
import { savGridTheme } from '../../shared/ag-grid-theme';
import { Liability, LiabilityType } from '../../shared/models/liability.model';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-liabilities',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatSnackBarModule,
    AgGridModule, PageHeaderComponent, MetricCardComponent, ChartCardComponent,
  ],
  templateUrl: './liabilities.component.html',
  styleUrls: ['./liabilities.component.scss'],
})
export class LiabilitiesComponent {
  readonly liabilityService = inject(LiabilityService);
  private readonly api = inject(ApiService);
  private readonly themeService = inject(ThemeService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly gridTheme = savGridTheme;

  readonly showForm = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly amortisationData = signal<any[]>([]);
  readonly showAmortisation = signal(false);

  readonly liabilityTypes: { value: LiabilityType; label: string }[] = [
    { value: 'mortgage', label: 'Mortgage' },
    { value: 'car_loan', label: 'Car Loan' },
    { value: 'student_loan', label: 'Student Loan' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'personal_loan', label: 'Personal Loan' },
  ];

  readonly liabilityForm = this.fb.group({
    name: ['', Validators.required],
    owner: [null as number | null, Validators.required],
    liability_type: ['personal_loan' as LiabilityType, Validators.required],
    principal: [0, [Validators.required, Validators.min(0)]],
    outstanding_balance: [0, [Validators.required, Validators.min(0)]],
    interest_rate: [0.025, [Validators.required, Validators.min(0)]],
    tenure_months: [120, [Validators.required, Validators.min(1)]],
    payment_frequency: ['monthly'],
    notes: [''],
  });

  readonly colDefs: ColDef<Liability>[] = [
    { field: 'name', headerName: 'Liability', flex: 2 },
    { field: 'liability_type', headerName: 'Type', flex: 1, valueFormatter: p => this.liabilityTypes.find(t => t.value === p.value)?.label ?? p.value },
    { field: 'owner_name', headerName: 'Owner', flex: 1 },
    { field: 'outstanding_balance', headerName: 'Balance', flex: 1, type: 'rightAligned', valueFormatter: p => `SGD ${(p.value ?? 0).toLocaleString('en-SG', { maximumFractionDigits: 0 })}`, cellStyle: { color: '#fb7185' } },
    { field: 'interest_rate', headerName: 'Rate', flex: 0.8, valueFormatter: p => `${((p.value ?? 0) * 100).toFixed(2)}%` },
    { field: 'tenure_months', headerName: 'Tenure', flex: 0.8, valueFormatter: p => `${p.value} mo` },
    {
      headerName: 'Actions', flex: 1, sortable: false,
      cellRenderer: (p: any) => `
        <div style="display:flex;gap:4px;align-items:center;height:100%">
          <button id="amort-${p.data.id}" style="background:rgba(6,182,212,0.1);border:none;color:#22d3ee;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px">Schedule</button>
          <button id="edit-${p.data.id}" style="background:rgba(99,102,241,0.12);border:none;color:#818cf8;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px">Edit</button>
          <button id="del-${p.data.id}" style="background:rgba(244,63,94,0.1);border:none;color:#fb7185;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px">Delete</button>
        </div>`,
      onCellClicked: (p) => {
        const id = (p.event?.target as HTMLElement)?.id;
        if (id?.startsWith('edit-') && p.data) this.openEdit(p.data);
        if (id?.startsWith('del-') && p.data) this.deleteLiability(p.data.id);
        if (id?.startsWith('amort-') && p.data) this.loadAmortisation(p.data.id);
      },
    },
  ];

  readonly defaultColDef: ColDef = { sortable: true, resizable: true };

  readonly metrics = computed<MetricCardConfig[]>(() => [
    { label: 'Total Debt', value: this.liabilityService.totalLiabilityValue(), format: 'currency', icon: 'credit_card', accentColor: '#f43f5e' },
    { label: 'Debt Instruments', value: this.liabilityService.liabilities().length, format: 'number', icon: 'list', accentColor: '#f59e0b' },
  ]);

  readonly amortChart = computed<EChartsOption>(() => {
    const data = this.amortisationData();
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#1e2740', borderColor: 'rgba(255,255,255,0.08)', textStyle: { color: '#f0f4ff', fontFamily: 'Inter' } },
      legend: { data: ['Principal', 'Interest', 'Balance'], textStyle: { color: '#8b9cc8', fontSize: 11 } },
      xAxis: { type: 'category', data: data.map(d => `P${d.period}`), axisLabel: { color: '#8b9cc8', fontSize: 10 }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } } },
      yAxis: { type: 'value', axisLabel: { color: '#8b9cc8', fontSize: 10, formatter: (v: number) => `$${(v / 1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
      series: [
        { name: 'Balance', type: 'line', data: data.map(d => d.balance), lineStyle: { color: '#6366f1' }, itemStyle: { color: '#6366f1' }, symbol: 'none', areaStyle: { color: 'rgba(99,102,241,0.08)' } },
        { name: 'Principal', type: 'bar', stack: 'payment', data: data.map(d => d.principal), itemStyle: { color: '#10b981' } },
        { name: 'Interest', type: 'bar', stack: 'payment', data: data.map(d => d.interest), itemStyle: { color: '#f43f5e' } },
      ],
    };
  });

  openCreate(): void {
    this.editingId.set(null);
    this.liabilityForm.reset({ liability_type: 'personal_loan', interest_rate: 0.025, tenure_months: 120, payment_frequency: 'monthly' });
    this.showForm.set(true);
    this.showAmortisation.set(false);
  }

  openEdit(liability: Liability): void {
    this.editingId.set(liability.id);
    this.liabilityForm.patchValue({ ...liability, owner: liability.owner as unknown as number });
    this.showForm.set(true);
  }

  save(): void {
    if (this.liabilityForm.invalid) return;
    this.saving.set(true);
    const data = this.liabilityForm.value as any;
    const id = this.editingId();
    const obs = id ? this.api.updateLiability(id, data) : this.api.createLiability(data);
    obs.subscribe({
      next: (l) => {
        if (id) this.liabilityService.updateLiability(l); else this.liabilityService.addLiability(l);
        this.showForm.set(false);
        this.saving.set(false);
        this.snackbar.open(id ? 'Updated' : 'Added', 'Close', { duration: 3000 });
      },
      error: () => { this.saving.set(false); },
    });
  }

  deleteLiability(id: number): void {
    this.api.deleteLiability(id).subscribe({
      next: () => { this.liabilityService.removeLiability(id); this.snackbar.open('Deleted', 'Close', { duration: 3000 }); },
    });
  }

  loadAmortisation(id: number): void {
    this.api.getAmortisation(id).subscribe({
      next: (res) => {
        this.amortisationData.set(res.schedule);
        this.showAmortisation.set(true);
        this.showForm.set(false);
      },
    });
  }

  cancelForm(): void { this.showForm.set(false); this.showAmortisation.set(false); }
}
