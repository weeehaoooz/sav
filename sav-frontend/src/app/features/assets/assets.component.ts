import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { CellStyleModule, CellValueChangedEvent, ClientSideRowModelModule, ColDef, DateEditorModule, GridApi, GridReadyEvent, ModuleRegistry, TextEditorModule, TooltipModule, ValidationModule } from 'ag-grid-community';

ModuleRegistry.registerModules([ClientSideRowModelModule, CellStyleModule, TooltipModule, ValidationModule, DateEditorModule, TextEditorModule]);

import { savGridTheme } from '../../shared/ag-grid-theme';
import { ActionsCellRendererComponent } from '../../shared/components/actions-cell-renderer/actions-cell-renderer.component';
import { CpfCellRendererComponent } from '../../shared/components/cpf-cell-renderer/cpf-cell-renderer.component';
import { MetricCardComponent, MetricCardConfig } from '../../shared/components/metric-card/metric-card.component';
import { MetricCellRendererComponent } from '../../shared/components/metric-cell-renderer/metric-cell-renderer.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { Asset, AssetType } from '../../shared/models/asset.model';
import { ApiService } from '../../shared/services/api.service';
import { AssetService } from '../../shared/services/asset.service';
import { NetworthService } from '../../shared/services/networth.service';
import { DashboardService } from '../../shared/services/dashboard.service';
import { ThemeService } from '../../shared/services/theme.service';
import { UserService } from '../../shared/services/user.service';
import { AssetFormComponent } from './components/asset-form/asset-form.component';

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSnackBarModule,
    MatDatepickerModule, MatNativeDateModule, MatTooltipModule,
    AgGridModule, PageHeaderComponent, MetricCardComponent, AssetFormComponent,
  ],
  templateUrl: './assets.component.html',
  styleUrls: ['./assets.component.scss'],
})
export class AssetsComponent implements OnInit {
  readonly dashboardService = inject(DashboardService);
  readonly assetService = inject(AssetService);
  readonly netWorthService = inject(NetworthService);
  private readonly api = inject(ApiService);
  private readonly themeService = inject(ThemeService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  protected readonly userService = inject(UserService);

  private gridApi!: GridApi;
  readonly showForm = signal(false);
  readonly isQuickEdit = signal(false);
  readonly selectedAssetForEdit = signal<Asset | null>(null);
  readonly saving = signal(false);
  readonly importing = signal(false);

  readonly displayAssets = computed(() => {
    const assets = this.assetService.assets();
    if (!this.isQuickEdit()) return assets;

    const expanded: any[] = [];
    for (const a of assets) {
      expanded.push(a);
      if (a.asset_type === 'cpf') {
        const subAccounts = [
          { type: 'cpf_oa', label: '↳ Ordinary Account (OA)', value: a.cpf_oa },
          { type: 'cpf_sa', label: '↳ Special Account (SA)', value: a.cpf_sa },
          { type: 'cpf_ma', label: '↳ MediSave Account (MA)', value: a.cpf_ma },
          { type: 'cpf_ra', label: '↳ Retirement Account (RA)', value: a.cpf_ra }
        ];

        for (const sub of subAccounts) {
          expanded.push({
            ...a,
            id: `${sub.type}_${a.id}`,
            name: sub.label,
            current_value: sub.value,
            asset_type: 'cpf_sub',
            isVirtualChild: true,
            virtualParentId: a.id,
            cpfSubAccountType: sub.type,
          });
        }
      }
    }
    return expanded;
  });

  readonly gridTheme = savGridTheme;
  readonly getRowId = (params: any) => params.data.id.toString();

  readonly allAssetTypes: { value: AssetType; label: string }[] = [
    { value: 'bank', label: 'Bank Account' },
    { value: 'equity', label: 'Equities' },
    { value: 'cpf', label: 'CPF (Consolidated)' },
  ];

  readonly colDefs: ColDef<any>[] = [
    {
      field: 'name', headerName: 'Asset Name', flex: 2, minWidth: 160,
      cellStyle: (p) => p.data?.isVirtualChild ? { paddingLeft: '32px', color: 'var(--text-secondary)' } : null
    },
    {
      field: 'asset_type', headerName: 'Type', flex: 1,
      valueFormatter: p => {
        if (p.data?.isVirtualChild) return '';
        return this.allAssetTypes.find(t => t.value === p.value)?.label ?? p.value;
      },
      tooltipValueGetter: p => {
        if (!p.data?.isVirtualChild && p.data?.asset_type === 'cpf') {
          const cfg = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
          const oa = Number(p.data.cpf_oa || 0).toLocaleString('en-SG', cfg);
          const sa = Number(p.data.cpf_sa || 0).toLocaleString('en-SG', cfg);
          const ma = Number(p.data.cpf_ma || 0).toLocaleString('en-SG', cfg);
          const ra = Number(p.data.cpf_ra || 0).toLocaleString('en-SG', cfg);
          return `OA: $${oa} | SA: $${sa} | MA: $${ma}${p.data.cpf_ra > 0 ? ' | RA: $' + ra : ''}`;
        }
        return '';
      }
    },
    {
      field: 'current_value', headerName: 'Current Value', flex: 1.2, minWidth: 150, type: 'rightAligned',
      editable: (p) => this.isQuickEdit() && (p.data?.asset_type !== 'cpf' || p.data?.isVirtualChild),
      cellClass: (p) => this.isQuickEdit() && (p.data?.asset_type !== 'cpf' || p.data?.isVirtualChild) ? 'editable-cell' : '',
      cellRendererSelector: (p) => {
        if (p.data?.asset_type === 'cpf' && !p.data?.isVirtualChild) {
          return { component: CpfCellRendererComponent };
        }
        return { component: MetricCellRendererComponent };
      },
      cellRendererParams: (p: any) => ({
        currency: p.data?.isVirtualChild ? '(SGD' : 'SGD',
        suffix: p.data?.isVirtualChild ? ')' : '',
        weight: p.data?.isVirtualChild ? 400 : 500,
        fontSize: p.data?.isVirtualChild ? '12px' : '13px',
        color: p.data?.isVirtualChild ? 'var(--text-secondary)' : 'var(--text-primary)'
      })
    },
    {
      field: 'ytd_gain_loss', headerName: 'Investment +/- (YTD)', flex: 1.2, minWidth: 140, type: 'rightAligned',
      tooltipValueGetter: () => 'Year-to-Date Performance: Total value change minus any increases in acquisition costs (contributions) since start of year.',
      cellRendererSelector: (p) => {
        if (p.data?.isVirtualChild) return undefined;
        return { component: MetricCellRendererComponent };
      },
      cellRendererParams: {
        currency: 'SGD',
        useColor: true,
        usePrefix: true,
        fontSize: '13px',
        weight: 400
      }
    },
    {
      headerName: 'ROI', flex: 0.8, minWidth: 100, type: 'rightAligned',
      valueGetter: p => {
        if (p.data?.isVirtualChild) return null;
        const current = p.data?.current_value || 0;
        const acq = p.data?.acquisition_value || 0;
        if (acq <= 0) return null;
        return ((current - acq) / acq) * 100;
      },
      cellRendererSelector: (p) => {
        if (p.value == null) return undefined;
        return { component: MetricCellRendererComponent };
      },
      cellRendererParams: {
        useColor: true,
        usePrefix: true,
        useIcon: true,
        suffix: '%',
        fontSize: '12px',
        weight: 400
      },
      tooltipValueGetter: () => 'Return on Investment: (Current Value - Acquisition Cost) / Acquisition Cost',
    },
    {
      field: 'valuation_date', headerName: 'Valuation Date', flex: 1,
      sort: 'desc',
      valueFormatter: p => {
        if (p.data?.isVirtualChild) return '';
        return p.value ? new Date(p.value).toLocaleDateString() : '—';
      },
    },
    {
      field: 'currency', headerName: 'Ccy', flex: 0.5,
      hide: true, // Kept hidden but available for tooltips or filtering
    },
    {
      headerName: 'Actions',
      flex: 1.2,
      sortable: false,
      filter: false,
      cellRenderer: ActionsCellRendererComponent,
      cellRendererParams: {
        actions: [
          {
            icon: 'history',
            tooltip: 'View Asset Details & History',
            class: 'btn-history',
            show: (p: any) => !p.data?.isVirtualChild,
            action: (p: any) => this.openHistory(p.data)
          },
          {
            icon: 'edit',
            tooltip: 'Edit Asset Information',
            class: 'btn-edit',
            show: (p: any) => !p.data?.isVirtualChild,
            action: (p: any) => this.openEdit(p.data)
          },
          {
            icon: 'delete',
            tooltip: 'Delete Asset Permanently',
            class: 'btn-delete',
            show: (p: any) => !p.data?.isVirtualChild,
            action: (p: any) => this.deleteAsset(p.data.id)
          }
        ]
      }
    },
  ];

  readonly defaultColDef: ColDef = {
    sortable: true,
    filter: false,
    resizable: true,
  };

  readonly metrics = computed<MetricCardConfig[]>(() => {
    const d = this.dashboardService.dashboard();
    return [
      {
        label: 'Net Worth',
        value: this.netWorthService.networth(),
        format: 'currency',
        icon: 'account_balance',
        accentColor: '#6366f1',
        subtitle: '(Net Value) Total Assets minus Total Liabilities (debts, loans)',
      },
      {
        label: 'YTD Networth Gain/Loss',
        value: this.assetService.assets().reduce((s, a) => s + (a.ytd_networth_gain || 0), 0),
        format: 'currency',
        icon: 'trending_up',
        accentColor: '#818cf8',
        subtitle: '(Total Change) Includes investment growth and capital contributions',
      },
      {
        label: 'Total Assets',
        value: this.assetService.totalAssetValue(),
        format: 'currency',
        icon: 'savings',
        accentColor: '#06b6d4',
        subtitle: '(Gross Value) Sum of all monetary assets (cash, investments, etc.)',
      },
      {
        label: 'Total YTD Gain/Loss',
        value: this.assetService.assets().reduce((s, a) => s + (a.ytd_gain_loss || 0), 0),
        format: 'currency',
        icon: 'show_chart',
        accentColor: '#10b981',
        subtitle: '(Performance) Investment returns only, excluding contributions',
      },
    ];
  });

  ngOnInit(): void {
    this.assetService.loadAssets();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  toggleQuickEdit(): void {
    const active = !this.isQuickEdit();
    this.isQuickEdit.set(active);
    console.log('Quick Edit Toggled:', active);

    if (this.gridApi) {
      // Force refresh cells to update editable status and classes
      // No need to set columns visible since we generate virtual rows for CPF now
      this.gridApi.refreshCells({ force: true });
    }
  }

  onCellValueChanged(params: CellValueChangedEvent): void {
    console.log('Cell Value Changed:', params.colDef.field, params.oldValue, '->', params.newValue);
    const { data, colDef, newValue } = params;
    if (!colDef.field) return;

    let valueToSend = newValue;
    // ensure numeric for current values and virtual child amounts
    if (colDef.field === 'current_value' || data.isVirtualChild) {
      valueToSend = Number(newValue);
      if (isNaN(valueToSend)) return;
    }

    // Intercept updates for dynamically generated CPF child rows
    if (data.isVirtualChild) {
      const parentId = data.virtualParentId;
      const field = data.cpfSubAccountType; // this maps to cpf_oa, cpf_sa, etc.
      const updateData = { [field]: valueToSend };

      this.api.updateAsset(parentId, updateData).subscribe({
        next: (updatedAsset) => {
          console.log('CPF Sub-account updated successfully:', updatedAsset);
          // Service update will trigger the `displayAssets` computation, refreshing our children rows
          this.assetService.updateAsset(updatedAsset);
          this.snackbar.open(`${data.name.replace('↳ ', '').trim()} updated`, 'Close', { duration: 2000 });
        },
        error: (err) => {
          console.error('Failed to update CPF sub-account:', err);
          this.snackbar.open('Failed to update CPF account', 'Close', { duration: 3000 });
          this.assetService.loadAssets();
        }
      });
      return;
    }

    const updateData = { [colDef.field]: valueToSend };

    this.api.updateAsset(data.id, updateData).subscribe({
      next: (updatedAsset) => {
        console.log('Asset updated successfully:', updatedAsset);
        this.assetService.updateAsset(updatedAsset);
        this.snackbar.open('Asset updated', 'Close', { duration: 2000 });
      },
      error: (err) => {
        console.error('Failed to update asset:', err);
        this.snackbar.open('Failed to update asset', 'Close', { duration: 3000 });
        this.assetService.loadAssets(); // Revert
      }
    });
  }

  openCreate(): void {
    this.selectedAssetForEdit.set(null);
    this.showForm.set(true);
  }

  openEdit(asset: Asset): void {
    this.selectedAssetForEdit.set(asset);
    this.showForm.set(true);
  }

  handleSave(formData: any): void {
    this.saving.set(true);
    const data = { ...formData };

    // Format date for backend (YYYY-MM-DD)
    if (data.valuation_date) {
      const d = new Date(data.valuation_date);
      data.valuation_date = d.toISOString().split('T')[0];
    }

    const editingAsset = this.selectedAssetForEdit();
    const id = editingAsset?.id;

    const obs = id ? this.api.updateAsset(id, data) : this.api.createAsset(data);
    obs.subscribe({
      next: (asset) => {
        if (id) this.assetService.updateAsset(asset);
        else this.assetService.addAsset(asset);
        this.showForm.set(false);
        this.saving.set(false);
        this.selectedAssetForEdit.set(null);
        this.snackbar.open(id ? 'Asset updated' : 'Asset added', 'Close', { duration: 3000 });
      },
      error: () => {
        this.saving.set(false);
        this.snackbar.open('Failed to save asset', 'Close', { duration: 3000 });
      },
    });
  }

  deleteAsset(id: number): void {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    this.api.deleteAsset(id).subscribe({
      next: () => {
        this.assetService.removeAsset(id);
        this.snackbar.open('Asset deleted', 'Close', { duration: 3000 });
      },
    });
  }

  cancelForm(): void {
    this.showForm.set(false);
  }

  triggerCsvImport(): void {
    const fileInput = document.getElementById('csvFileInput') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  downloadTemplate(): void {
    const headers = ['name', 'asset_type', 'current_value', 'acquisition_value', 'valuation_date', 'cpf_oa', 'cpf_sa', 'cpf_ma', 'cpf_ra'];
    const example = ['DBS Savings', 'bank', '50000', '50000', new Date().toISOString().split('T')[0], '0', '0', '0', '0'];
    const csvContent = [headers.join(','), example.join(',')].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'assets_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const content = e.target.result;
      this.parseAndImportCsv(content);
      // Reset input
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  private parseAndImportCsv(content: string): void {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      this.snackbar.open('CSV file is empty or missing header', 'Close', { duration: 3000 });
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const assets: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < headers.length) continue;

      const asset: any = {};
      headers.forEach((header, index) => {
        const val = values[index];
        if (header === 'name') asset.name = val;
        else if (header === 'asset_type') asset.asset_type = val;
        else if (header === 'current_value') asset.current_value = Number(val);
        else if (header === 'acquisition_value') asset.acquisition_value = Number(val);
        else if (header === 'valuation_date') asset.valuation_date = val;
        else if (header === 'cpf_oa') asset.cpf_oa = Number(val);
        else if (header === 'cpf_sa') asset.cpf_sa = Number(val);
        else if (header === 'cpf_ma') asset.cpf_ma = Number(val);
        else if (header === 'cpf_ra') asset.cpf_ra = Number(val);
      });

      if (asset.name && asset.asset_type) {
        assets.push(asset);
      }
    }

    if (assets.length === 0) {
      this.snackbar.open('No valid assets found in CSV', 'Close', { duration: 3000 });
      return;
    }

    this.importing.set(true);
    this.api.bulkCreateAssets(assets).subscribe({
      next: (created) => {
        created.forEach(a => this.assetService.addAsset(a));
        this.importing.set(false);
        this.snackbar.open(`Successfully imported ${created.length} assets`, 'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error('Import failed:', err);
        this.importing.set(false);
        this.snackbar.open('Failed to import assets. Please check CSV format.', 'Close', { duration: 5000 });
      }
    });
  }

  private readonly router = inject(Router);

  openHistory(asset: Asset): void {
    this.router.navigate(['/assets', asset.id]);
  }
}
