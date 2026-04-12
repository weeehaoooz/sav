import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GridApi, CellStyleModule } from 'ag-grid-community';
import { ModuleRegistry, ClientSideRowModelModule, TooltipModule, ValidationModule } from 'ag-grid-community';

ModuleRegistry.registerModules([ClientSideRowModelModule, CellStyleModule, TooltipModule, ValidationModule]);

import { StateService } from '../../shared/services/state.service';
import { ApiService } from '../../shared/services/api.service';
import { ThemeService } from '../../shared/services/theme.service';
import { AssetService } from '../../shared/services/asset.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { MetricCardComponent, MetricCardConfig } from '../../shared/components/metric-card/metric-card.component';
import { savGridTheme } from '../../shared/ag-grid-theme';
import { Asset, AssetType } from '../../shared/models/asset.model';
import { AssetHistoryDialogComponent } from './asset-history-dialog/asset-history-dialog.component';
import { UserService } from '../../shared/services/user.service';
import { NetworthService } from '../../shared/services/networth.service';
import { AssetFormComponent } from './components/asset-form/asset-form.component';

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSnackBarModule,
    MatDatepickerModule, MatNativeDateModule, MatTooltipModule,
    AgGridModule, PageHeaderComponent, MetricCardComponent, AssetFormComponent
  ],
  templateUrl: './assets.component.html',
  styleUrls: ['./assets.component.scss'],
})
export class AssetsComponent implements OnInit {
  readonly state = inject(StateService);
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
  readonly selectedAssetForEdit = signal<Asset | null>(null);
  readonly saving = signal(false);

  readonly gridTheme = savGridTheme;

  readonly allAssetTypes: { value: AssetType; label: string }[] = [
    { value: 'bank', label: 'Bank Account' },
    { value: 'equity', label: 'Equities' },
    { value: 'cpf', label: 'CPF (Consolidated)' },
  ];

  readonly colDefs: ColDef<Asset>[] = [
    { field: 'name', headerName: 'Asset Name', flex: 2, minWidth: 160 },
    {
      field: 'asset_type', headerName: 'Type', flex: 1,
      valueFormatter: p => this.allAssetTypes.find(t => t.value === p.value)?.label ?? p.value,
      tooltipValueGetter: p => {
        if (p.data?.asset_type === 'cpf') {
          return `OA: $${p.data.cpf_oa.toLocaleString()} | SA: $${p.data.cpf_sa.toLocaleString()} | MA: $${p.data.cpf_ma.toLocaleString()}${p.data.cpf_ra > 0 ? ' | RA: $' + p.data.cpf_ra.toLocaleString() : ''}`;
        }
        return '';
      }
    },
    {
      field: 'current_value', headerName: 'Current Value', flex: 1, type: 'rightAligned',
      valueFormatter: p => `SGD ${(p.value ?? 0).toLocaleString('en-SG', { maximumFractionDigits: 0 })}`,
    },
    {
      field: 'ytd_gain_loss', headerName: 'Gains and Loss (YTD)', flex: 1, type: 'rightAligned',
      tooltipValueGetter: () => 'Year-to-Date Change: Compares current value to the earliest entry of this year.',
      cellStyle: p => ({ color: (p.value ?? 0) >= 0 ? '#34d399' : '#fb7185' }),
      valueFormatter: p => {
        const v = p.value ?? 0;
        const currency = p.data?.currency || 'SGD';
        return `${v >= 0 ? '+' : ''}${currency} ${Math.abs(v).toLocaleString('en-SG', { maximumFractionDigits: 0 })}`;
      },
    },
    {
      field: 'valuation_date', headerName: 'Latest Acquisition Date', flex: 1,
      sort: 'desc',
      valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString() : '—',
    },
    {
      field: 'currency', headerName: 'Ccy', flex: 0.5,
      hide: true, // Kept hidden but available for tooltips or filtering
    },
    {
      headerName: 'Actions', flex: 1.2, sortable: false, filter: false,
      cellRenderer: (p: any) => `
        <div style="display:flex;gap:4px;align-items:center;height:100%">
          <button id="history-${p.data.id}" style="background:rgba(52,211,153,0.12);border:none;color:#34d399;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px">History</button>
          <button id="edit-${p.data.id}" style="background:rgba(99,102,241,0.12);border:none;color:#818cf8;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px">Update</button>
          <button id="del-${p.data.id}" style="background:rgba(244,63,94,0.1);border:none;color:#fb7185;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px">Delete</button>
        </div>`,
      onCellClicked: (p) => {
        const target = p.event?.target as HTMLElement;
        if (target?.id?.startsWith('history-') && p.data) this.openHistory(p.data);
        if (target?.id?.startsWith('edit-') && p.data) this.openEdit(p.data);
        if (target?.id?.startsWith('del-') && p.data) this.deleteAsset(p.data.id);
      },
    },
  ];

  readonly defaultColDef: ColDef = {
    sortable: true,
    filter: false,
    resizable: true,
  };

  readonly metrics = computed<MetricCardConfig[]>(() => {
    const d = this.state.dashboard();
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
        icon: 'trending_up',
        accentColor: '#10b981',
        subtitle: '(Performance) Total value change since start of year',
      },
      {
        label: 'Asset Count',
        value: this.assetService.assets().length,
        format: 'number',
        icon: 'list',
        accentColor: '#f59e0b',
        subtitle: '(Portfolio) Total number of individual assets',
      },
    ];
  });

  ngOnInit(): void {
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
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

  openHistory(asset: Asset): void {
    const dialogRef = this.dialog.open(AssetHistoryDialogComponent, {
      data: { asset },
      width: '800px'
    });

    dialogRef.afterClosed().subscribe(() => {
      // Refresh assets in case history was deleted and master value changed
      this.assetService.loadAssets();
    });
  }
}
