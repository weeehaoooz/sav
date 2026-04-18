import { Component, inject, signal, OnInit, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GridApi, ModuleRegistry, ClientSideRowModelModule, TooltipModule } from 'ag-grid-community';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { EChartsOption } from 'echarts';

import { ApiService } from '../../../shared/services/api.service';
import { ThemeService } from '../../../shared/services/theme.service';
import { Asset, AssetValuationHistory } from '../../../shared/models/asset.model';
import { savGridTheme } from '../../../shared/ag-grid-theme';
import { ActionsCellRendererComponent } from '../../../shared/components/actions-cell-renderer/actions-cell-renderer.component';
import { MetricCellRendererComponent } from '../../../shared/components/metric-cell-renderer/metric-cell-renderer.component';
import { CpfCellRendererComponent } from '../../../shared/components/cpf-cell-renderer/cpf-cell-renderer.component';

ModuleRegistry.registerModules([ClientSideRowModelModule, TooltipModule]);

@Component({
  selector: 'app-asset-history-dialog',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatSnackBarModule, AgGridModule, NgxEchartsModule,
    ActionsCellRendererComponent, MetricCellRendererComponent, CpfCellRendererComponent
  ],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts: () => import('echarts') }
    }
  ],
  templateUrl: './asset-history-dialog.component.html',
  styleUrls: ['./asset-history-dialog.component.scss']
})
export class AssetHistoryDialogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackbar = inject(MatSnackBar);
  protected readonly themeService = inject(ThemeService);
  readonly dialogRef = inject(MatDialogRef<AssetHistoryDialogComponent>);
  readonly data = inject<{ asset: Asset }>(MAT_DIALOG_DATA);

  private gridApi!: GridApi;
  readonly gridTheme = savGridTheme;
  readonly history = signal<AssetValuationHistory[]>([]);
  readonly loading = signal(true);
  readonly chartOptions = signal<EChartsOption>({});

  readonly colDefs: ColDef<AssetValuationHistory>[] = [
    {
      field: 'valuation_date',
      headerName: 'Date',
      flex: 1,
      sort: 'desc',
      valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
    },
    {
      field: 'current_value',
      headerName: 'Value',
      flex: 1.5,
      minWidth: 150,
      cellRenderer: this.data.asset.asset_type === 'cpf' ? CpfCellRendererComponent : MetricCellRendererComponent,
      cellRendererParams: {
        currency: this.data.asset.currency || 'SGD',
        weight: 600,
        fontSize: '15px',
        color: 'var(--text-primary)'
      }
    },
    {
      field: 'acquisition_value',
      headerName: 'Acquisition',
      flex: 1.3,
      minWidth: 130,
      hide: this.data.asset.asset_type === 'bank' || this.data.asset.asset_type === 'cpf',
      cellRenderer: MetricCellRendererComponent,
      cellRendererParams: {
        currency: this.data.asset.currency || 'SGD',
        weight: 400,
        fontSize: '13px',
        color: 'var(--text-secondary)'
      }
    },
    {
      headerName: 'Net G/L',
      flex: 1.2,
      minWidth: 110,
      hide: this.data.asset.asset_type === 'bank' || this.data.asset.asset_type === 'cpf',
      valueGetter: (p) => (p.data?.current_value || 0) - (p.data?.acquisition_value || 0),
      cellRenderer: MetricCellRendererComponent,
      cellRendererParams: {
        currency: this.data.asset.currency || 'SGD',
        useColor: true,
        useIcon: true,
        usePrefix: true,
        fontSize: '13px',
        weight: 600
      }
    },
    {
      headerName: '',
      width: 100,
      suppressHeaderMenuButton: true,
      sortable: false,
      cellRenderer: ActionsCellRendererComponent,
      cellRendererParams: {
        actions: [
          {
            icon: 'delete',
            tooltip: 'Delete this historical record',
            class: 'btn-delete',
            action: (p: any) => this.deleteEntry(p.data.id)
          }
        ]
      }
    }
  ];

  constructor() {
    effect(() => {
      const data = this.history();
      const isDark = this.themeService.isDark();
      untracked(() => this.updateChartOptions(data, isDark));
    });
  }

  ngOnInit(): void {
    this.loadHistory();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  loadHistory(): void {
    this.loading.set(true);
    this.api.getAssetHistory(this.data.asset.id).subscribe({
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

  updateChartOptions(history: AssetValuationHistory[], isDark: boolean): void {
    if (history.length === 0) return;

    // Sort history by date for chart
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
            <div style="font-weight: 600">${this.data.asset.currency} ${Number(p.value).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>`;
        }
      },
      grid: {
        left: '2%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
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
        lineStyle: { width: 3, color: '#6366f1' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(99, 102, 241, 0.3)' },
              { offset: 1, color: 'rgba(99, 102, 241, 0.05)' }
            ]
          }
        }
      }]
    });
  }

  deleteEntry(id: number): void {
    if (!confirm('Are you sure you want to delete this historical valuation?')) return;

    this.api.deleteAssetHistory(id).subscribe({
      next: () => {
        this.snackbar.open('Entry deleted', 'Close', { duration: 3000 });
        this.loadHistory();
      },
      error: () => {
        this.snackbar.open('Failed to delete entry', 'Close', { duration: 3000 });
      }
    });
  }
}

