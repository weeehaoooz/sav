import { Component, inject, signal, OnInit, effect, untracked, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
import { MetricCardComponent, MetricCardConfig } from '../../../shared/components/metric-card/metric-card.component';

ModuleRegistry.registerModules([ClientSideRowModelModule, TooltipModule]);

@Component({
  selector: 'app-asset-details',
  standalone: true,
  imports: [
    CommonModule, AgGridModule, NgxEchartsModule, MatSnackBarModule
  ],
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts: () => import('echarts') }
    }
  ],
  templateUrl: './asset-details.component.html',
  styleUrls: ['./asset-details.component.scss']
})
export class AssetDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly api = inject(ApiService);
  private readonly snackbar = inject(MatSnackBar);
  protected readonly themeService = inject(ThemeService);

  private gridApi!: GridApi;
  readonly gridTheme = savGridTheme;

  readonly asset = signal<Asset | null>(null);
  readonly history = signal<AssetValuationHistory[]>([]);
  readonly loading = signal(true);
  readonly chartOptions = signal<EChartsOption>({});

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

    if (asset.asset_type !== 'bank' && asset.asset_type !== 'cpf') {
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
        }
      );
    }

    return items;
  });

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
      flex: 1.3,
      cellRenderer: (p: any) => {
        const val = Number(p.value ?? 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const currency = this.asset()?.currency || 'SGD';
        if (this.asset()?.asset_type === 'cpf') {
          return `
            <div class="cpf-cell-breakdown">
              <span class="main-val">${currency} ${val}</span>
              <span class="sub-vals">OA: ${Number(p.data.cpf_oa || 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | SA: ${Number(p.data.cpf_sa || 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | MA: ${Number(p.data.cpf_ma || 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          `;
        }
        return `<span style="font-weight: 500; color: var(--text-primary)">${currency} ${val}</span>`;
      }
    },
    {
      field: 'acquisition_value',
      headerName: 'Acquisition',
      flex: 1.3,
      hide: false, // Update below during fetch
      cellRenderer: (p: any) => {
        const val = Number(p.value ?? 0).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const currency = this.asset()?.currency || 'SGD';
        return `<span style="font-weight: 400; color: var(--text-secondary)">${currency} ${val}</span>`;
      }
    },
    {
      headerName: 'Net G/L',
      flex: 1.2,
      hide: false, // Update below during fetch
      valueGetter: (p) => (p.data?.current_value || 0) - (p.data?.acquisition_value || 0),
      cellRenderer: (p: any) => {
        const val = p.value;
        const formatted = Number(Math.abs(val)).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const currency = this.asset()?.currency || 'SGD';
        const color = val >= 0 ? '#34d399' : '#fb7185';
        const icon = val >= 0 ? 'trending_up' : 'trending_down';
        const prefix = val >= 0 ? '+' : '-';
        return `
          <div style="display: flex; align-items: center; gap: 4px; color: ${color}; font-weight: 600">
            <span class="material-icons" style="font-size: 14px">${icon}</span>
            <span>${prefix}${currency} ${formatted}</span>
          </div>
        `;
      }
    },
    {
      headerName: 'Actions',
      width: 100,
      suppressHeaderMenuButton: true,
      sortable: false,
      cellRenderer: (p: any) => `
        <div style="display:flex;align-items:center;justify-content:center;height:100%">
          <button id="del-hist-${p.data.id}" style="background:rgba(244,63,94,0.1);border:none;color:#fb7185;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;display:flex;align-items:center;gap:4px">
            <span class="material-icons" style="font-size:14px">delete</span>
          </button>
        </div>`,
      onCellClicked: (p) => {
        const target = p.event?.target as HTMLElement;
        const btn = target.closest('button');
        if (btn?.id?.startsWith('del-hist-') && p.data) this.deleteEntry(p.data.id);
      }
    }
  ];

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
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  loadAsset(id: number): void {
    this.loading.set(true);
    this.api.getAsset(id).subscribe({
      next: (asset) => {
        this.asset.set(asset);
        // Hide acquisition and Net G/L columns for bank and cpf
        const type = asset.asset_type;
        const hideCols = type === 'bank' || type === 'cpf';
        this.colDefs[2].hide = hideCols;
        this.colDefs[3].hide = hideCols;

        if (this.gridApi) {
          this.gridApi.setGridOption('columnDefs', this.colDefs);
        }

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

  updateChartOptions(history: AssetValuationHistory[], isDark: boolean, asset: Asset): void {
    if (history.length === 0) {
      this.chartOptions.set({});
      return;
    }

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
            <div style="font-weight: 600">${asset.currency} ${Number(p.value).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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

  deleteEntry(id: number): void {
    if (!confirm('Are you sure you want to delete this historical valuation?')) return;

    this.api.deleteAssetHistory(id).subscribe({
      next: () => {
        this.snackbar.open('Entry deleted', 'Close', { duration: 3000 });
        const currentAsset = this.asset();
        if (currentAsset) this.loadHistory(currentAsset.id);
      },
      error: () => {
        this.snackbar.open('Failed to delete entry', 'Close', { duration: 3000 });
      }
    });
  }

  goBack(): void {
    this.location.back();
  }
}
