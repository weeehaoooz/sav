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
  DateEditorModule, TextEditorModule, ValidationModule, CellStyleModule, CellValueChangedEvent
} from 'ag-grid-community';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';

import { trigger, transition, style, animate } from '@angular/animations';

import { ApiService } from '../../../shared/services/api.service';
import { ThemeService } from '../../../shared/services/theme.service';
import { Asset, AssetValuationHistory } from '../../../shared/models/asset.model';
import { savGridTheme } from '../../../shared/ag-grid-theme';
import { MetricCardConfig } from '../../../shared/components/metric-card/metric-card.component';
import { ActionsCellRendererComponent, ActionCellRendererParams } from '../../../shared/components/actions-cell-renderer/actions-cell-renderer.component';
import { MetricCellRendererComponent } from '../../../shared/components/metric-cell-renderer/metric-cell-renderer.component';
import { CpfCellRendererComponent } from '../../../shared/components/cpf-cell-renderer/cpf-cell-renderer.component';

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  TooltipModule,
  DateEditorModule,
  TextEditorModule,
  ValidationModule,
  CellStyleModule
]);

@Component({
  selector: 'app-asset-details',
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
  templateUrl: './asset-details.component.html',
  styleUrls: ['./asset-details.component.scss']
})
export class AssetDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly snackbar = inject(MatSnackBar);
  protected readonly themeService = inject(ThemeService);

  private gridApi!: GridApi;
  readonly gridTheme = savGridTheme;

  readonly asset = signal<Asset | null>(null);
  readonly history = signal<AssetValuationHistory[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly chartOptions = signal<EChartsOption>({});
  readonly isQuickEdit = signal(false);

  // ── Add Entry Form ────────────────────────────────────────────────────────
  readonly showAddForm = signal(false);
  entryForm!: FormGroup;

  readonly isCpf = computed(() => this.asset()?.asset_type === 'cpf');
  readonly isEquity = computed(() => this.asset()?.asset_type === 'equity');

  readonly metrics = computed<MetricCardConfig[]>(() => {
    const asset = this.asset();
    if (!asset) return [];

    const currency = asset.currency || 'SGD';
    const currentVal = asset.current_value || 0;
    const acqVal = asset.acquisition_value || 0;
    const gainLoss = currentVal - acqVal;
    const roi = acqVal > 0 ? (gainLoss / acqVal) * 100 : 0;

    const items: MetricCardConfig[] = [
      {
        label: 'Current Value',
        value: currentVal,
        format: 'currency',
        icon: 'payments',
        accentColor: '#6366f1',
        subtitle: `Latest valuation in ${currency}`,
      }
    ];

    // Show performance metrics for everything except plain bank accounts
    if (asset.asset_type !== 'bank') {
      items.push(
        {
          label: 'Total Gain/Loss',
          value: gainLoss,
          format: 'currency',
          icon: gainLoss >= 0 ? 'trending_up' : 'trending_down',
          accentColor: gainLoss >= 0 ? '#34d399' : '#fb7185',
          subtitle: 'All-time performance',
        },
        {
          label: 'ROI',
          value: roi,
          format: 'percent',
          icon: 'pie_chart',
          accentColor: '#818cf8',
          subtitle: 'Return on Investment',
        },
        {
          label: 'YTD Gain/Loss',
          value: asset.ytd_gain_loss || 0,
          format: 'currency',
          icon: (asset.ytd_gain_loss || 0) >= 0 ? 'stat_1' : 'stat_minus_1',
          accentColor: (asset.ytd_gain_loss || 0) >= 0 ? '#10b981' : '#f43f5e',
          subtitle: 'Gains within this year',
        },
        {
          label: 'YTD Performance',
          value: asset.ytd_gain_loss_pct || 0,
          format: 'percent',
          icon: 'query_stats',
          accentColor: (asset.ytd_gain_loss_pct || 0) >= 0 ? '#34d399' : '#fb7185',
          subtitle: 'Year-to-date return',
        }
      );
    }

    return items;
  });

  readonly colDefs = computed<ColDef<AssetValuationHistory>[]>(() => {
    const currentAsset = this.asset();
    const currency = currentAsset?.currency || 'SGD';
    const type = currentAsset?.asset_type;
    const hidePerformance = type === 'bank' || type === 'cpf';

    return [
      {
        field: 'valuation_date',
        headerName: 'Date',
        flex: 1,
        minWidth: 110,
        sort: 'desc',
        editable: () => this.isQuickEdit(),
        cellClass: () => this.isQuickEdit() ? 'editable-cell' : '',
        cellEditor: 'agDateStringCellEditor',
        valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
      },
      {
        field: 'current_value',
        headerName: 'Value',
        flex: 1.5,
        minWidth: 160,
        editable: (p) => this.isQuickEdit() && type !== 'cpf',
        cellClass: (p) => (this.isQuickEdit() && type !== 'cpf') ? 'editable-cell' : '',
        cellEditorParams: { useFormatter: true },
        cellRenderer: type === 'cpf' ? CpfCellRendererComponent : MetricCellRendererComponent,
        cellRendererParams: {
          currency: currency,
          weight: 500,
          fontSize: '13px',
          color: 'var(--text-primary)'
        }
      },
      {
        field: 'acquisition_value',
        headerName: 'Acquisition',
        flex: 1.3,
        minWidth: 140,
        hide: hidePerformance,
        editable: () => this.isQuickEdit(),
        cellClass: () => this.isQuickEdit() ? 'editable-cell' : '',
        cellRenderer: MetricCellRendererComponent,
        cellRendererParams: {
          currency: currency,
          weight: 400,
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }
      },
      {
        headerName: 'Net G/L',
        flex: 1.2,
        minWidth: 120,
        hide: hidePerformance,
        valueGetter: (p) => (p.data?.current_value || 0) - (p.data?.acquisition_value || 0),
        cellRenderer: MetricCellRendererComponent,
        cellRendererParams: {
          currency: currency,
          useColor: true,
          useIcon: true,
          usePrefix: true,
          fontSize: '13px',
          weight: 400
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
              tooltip: 'Edit this historical entry',
              class: 'btn-edit',
              action: (p: ActionCellRendererParams) => this.openEditEntry(p.data)
            },
            {
              icon: 'delete',
              tooltip: 'Delete this historical entry',
              class: 'btn-delete',
              action: (p: ActionCellRendererParams) => this.deleteEntry(p.data.id)
            }
          ]
        } as ActionCellRendererParams
      }
    ];
  });

  // ── Editing an existing entry ─────────────────────────────────────────────
  readonly editingEntry = signal<AssetValuationHistory | null>(null);

  constructor() {
    effect(() => {
      const data = this.history();
      const isDark = this.themeService.isDark();
      const currentAsset = this.asset();
      if (currentAsset) {
        untracked(() => this.updateChartOptions(data, isDark, currentAsset));
      }
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.loadAsset(Number(idParam));
    } else {
      this.goBack();
    }
    this.buildForm();
  }

  private buildForm(prefill?: Partial<AssetValuationHistory>): void {
    const today = new Date().toISOString().split('T')[0];
    this.entryForm = this.fb.group({
      valuation_date: [prefill?.valuation_date ?? today, Validators.required],
      current_value: [prefill?.current_value ?? null, [Validators.required, Validators.min(0)]],
      acquisition_value: [prefill?.acquisition_value ?? 0, Validators.min(0)],
      cpf_oa: [prefill?.cpf_oa ?? 0, Validators.min(0)],
      cpf_sa: [prefill?.cpf_sa ?? 0, Validators.min(0)],
      cpf_ma: [prefill?.cpf_ma ?? 0, Validators.min(0)],
      cpf_ra: [prefill?.cpf_ra ?? 0, Validators.min(0)],
    });
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  toggleQuickEdit(): void {
    this.isQuickEdit.update(v => !v);
    if (this.gridApi) {
      this.gridApi.refreshCells({ force: true });
    }
  }

  onCellValueChanged(params: CellValueChangedEvent): void {
    const { data, colDef, newValue } = params;
    if (!colDef.field) return;

    this.saving.set(true);
    const payload: Partial<AssetValuationHistory> = {
      [colDef.field]: colDef.field.includes('date') ? newValue : Number(newValue)
    };

    this.api.updateAssetHistory(data.id, payload).subscribe({
      next: () => {
        this.snackbar.open('Changes saved automatically', 'Close', { duration: 2000 });
        const currentAsset = this.asset();
        if (currentAsset) this.refreshAll(currentAsset.id);
        this.saving.set(false);
      },
      error: () => {
        this.snackbar.open('Failed to auto-save', 'Close', { duration: 3000 });
        this.saving.set(false);
        this.loadHistory(data.asset); // Revert
      }
    });
  }

  loadAsset(id: number): void {
    this.loading.set(true);
    this.api.getAsset(id).subscribe({
      next: (asset) => {
        this.asset.set(asset);
        this.loadHistory(id);
      },
      error: () => {
        this.snackbar.open('Failed to load asset details', 'Close', { duration: 3000 });
        this.goBack();
      }
    });
  }

  loadHistory(id: number): void {
    this.api.getAssetHistory(id).subscribe({
      next: (data) => {
        this.history.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.snackbar.open('Failed to load history', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  // ── Add Entry Form ────────────────────────────────────────────────────────

  toggleAddForm(): void {
    if (this.editingEntry()) {
      // Cancel edit, switch to empty add mode
      this.editingEntry.set(null);
      this.buildForm();
      this.showAddForm.set(true);
    } else {
      this.showAddForm.update(v => !v);
      if (!this.showAddForm()) {
        this.buildForm(); // reset on close
      }
    }
  }

  openEditEntry(entry: AssetValuationHistory): void {
    this.editingEntry.set(entry);
    this.buildForm(entry);
    this.showAddForm.set(true);
    // Scroll to form after tick
    setTimeout(() => {
      document.querySelector('.add-entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  cancelForm(): void {
    this.showAddForm.set(false);
    this.editingEntry.set(null);
    this.buildForm();
  }

  saveEntry(): void {
    if (this.entryForm.invalid) {
      this.entryForm.markAllAsTouched();
      return;
    }

    const asset = this.asset();
    if (!asset) return;

    this.saving.set(true);
    const raw = this.entryForm.value;

    // If CPF, compute current_value from sub-accounts
    const payload: Partial<AssetValuationHistory> = {
      valuation_date: raw.valuation_date,
      acquisition_value: Number(raw.acquisition_value) || 0,
    };

    if (this.isCpf()) {
      const oa = Number(raw.cpf_oa) || 0;
      const sa = Number(raw.cpf_sa) || 0;
      const ma = Number(raw.cpf_ma) || 0;
      const ra = Number(raw.cpf_ra) || 0;
      payload.cpf_oa = oa;
      payload.cpf_sa = sa;
      payload.cpf_ma = ma;
      payload.cpf_ra = ra;
      payload.current_value = oa + sa + ma + ra;
    } else {
      payload.current_value = Number(raw.current_value) || 0;
    }

    const editEntry = this.editingEntry();

    if (editEntry) {
      // UPDATE existing
      this.api.updateAssetHistory(editEntry.id, payload).subscribe({
        next: () => {
          this.snackbar.open('Entry updated', 'Close', { duration: 2500 });
          this.saving.set(false);
          this.cancelForm();
          this.refreshAll(asset.id);
        },
        error: () => {
          this.snackbar.open('Failed to update entry', 'Close', { duration: 3000 });
          this.saving.set(false);
        }
      });
    } else {
      // CREATE new
      payload.asset = asset.id;
      this.api.createAssetHistory(payload).subscribe({
        next: () => {
          this.snackbar.open('Entry added', 'Close', { duration: 2500 });
          this.saving.set(false);
          this.cancelForm();
          this.refreshAll(asset.id);
        },
        error: () => {
          this.snackbar.open('Failed to add entry', 'Close', { duration: 3000 });
          this.saving.set(false);
        }
      });
    }
  }

  private refreshAll(assetId: number): void {
    // Refresh both asset (for metrics) and history (for grid + chart)
    this.api.getAsset(assetId).subscribe(asset => this.asset.set(asset));
    this.loadHistory(assetId);
  }

  deleteEntry(id: number): void {
    if (!confirm('Are you sure you want to delete this historical valuation?')) return;

    this.api.deleteAssetHistory(id).subscribe({
      next: () => {
        this.snackbar.open('Entry deleted', 'Close', { duration: 3000 });
        const currentAsset = this.asset();
        if (currentAsset) this.refreshAll(currentAsset.id);
      },
      error: () => {
        this.snackbar.open('Failed to delete entry', 'Close', { duration: 3000 });
      }
    });
  }

  updateChartOptions(history: AssetValuationHistory[], isDark: boolean, asset: Asset): void {
    if (history.length === 0) {
      this.chartOptions.set({});
      return;
    }

    const sortedData = [...history].sort((a, b) =>
      new Date(a.valuation_date).getTime() - new Date(b.valuation_date).getTime()
    );

    const dates = sortedData.map(h => new Date(h.valuation_date).toLocaleDateString('en-SG', { day: '2-digit', month: 'short' }));
    const values = sortedData.map(h => h.current_value);

    const textColor = isDark ? '#94a3b8' : '#64748b';
    const splitLineColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    this.chartOptions.set({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        textStyle: { color: isDark ? '#f8fafc' : '#1e293b' },
        formatter: (params: any) => {
          const p = params[0];
          return `<div style="padding: 4px">
            <div style="font-size: 11px; margin-bottom: 4px; color: ${textColor}">${p.name}</div>
            <div style="font-weight: 600">${asset.currency} ${Number(p.value).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>`;
        }
      },
      grid: { left: '2%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dates,
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
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3, color: '#34d399' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(52, 211, 153, 0.3)' },
              { offset: 1, color: 'rgba(52, 211, 153, 0.05)' }
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
