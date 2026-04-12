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
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community';
import { ModuleRegistry, ClientSideRowModelModule } from 'ag-grid-community';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

import { StateService } from '../../shared/services/state.service';
import { ApiService } from '../../shared/services/api.service';
import { ThemeService } from '../../shared/services/theme.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { MetricCardComponent, MetricCardConfig } from '../../shared/components/metric-card/metric-card.component';
import { savGridTheme } from '../../shared/ag-grid-theme';
import { Asset, AssetType } from '../../shared/models/asset.model';

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSnackBarModule,
    AgGridModule, PageHeaderComponent, MetricCardComponent,
  ],
  templateUrl: './assets.component.html',
  styleUrls: ['./assets.component.scss'],
})
export class AssetsComponent implements OnInit {
  readonly state = inject(StateService);
  private readonly api = inject(ApiService);
  private readonly themeService = inject(ThemeService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  private gridApi!: GridApi;
  readonly showForm = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);

  readonly gridTheme = savGridTheme;

  readonly assetForm = this.fb.group({
    name: ['', Validators.required],
    asset_type: ['bank' as AssetType, Validators.required],
    current_value: [0, [Validators.required, Validators.min(0)]],
    acquisition_value: [0, Validators.min(0)],
    growth_rate: [0.07],
    liquidity_score: [5, [Validators.min(1), Validators.max(10)]],
    notes: [''],
  });

  readonly assetTypes: { value: AssetType; label: string }[] = [
    { value: 'bank', label: 'Bank Account' },
    { value: 'cpf', label: 'CPF' },
    { value: 'equity', label: 'Equities' },
    { value: 'property', label: 'Property' },
    { value: 'crypto', label: 'Crypto' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'alternatives', label: 'Alternatives' },
  ];

  readonly colDefs: ColDef<Asset>[] = [
    { field: 'name', headerName: 'Asset Name', flex: 2, minWidth: 160 },
    {
      field: 'asset_type', headerName: 'Type', flex: 1,
      valueFormatter: p => this.assetTypes.find(t => t.value === p.value)?.label ?? p.value,
    },
    {
      field: 'current_value', headerName: 'Current Value', flex: 1, type: 'rightAligned',
      valueFormatter: p => `SGD ${(p.value ?? 0).toLocaleString('en-SG', { maximumFractionDigits: 0 })}`,
    },
    {
      field: 'gain_loss', headerName: 'Gain/Loss', flex: 1, type: 'rightAligned',
      cellStyle: p => ({ color: (p.value ?? 0) >= 0 ? '#34d399' : '#fb7185' }),
      valueFormatter: p => {
        const v = p.value ?? 0;
        return `${v >= 0 ? '+' : ''}SGD ${Math.abs(v).toLocaleString('en-SG', { maximumFractionDigits: 0 })}`;
      },
    },
    {
      field: 'growth_rate', headerName: 'Growth Rate', flex: 1,
      valueFormatter: p => `${((p.value ?? 0) * 100).toFixed(1)}%`,
    },
    { field: 'liquidity_score', headerName: 'Liquidity', flex: 0.7 },
    {
      headerName: 'Actions', flex: 0.8, sortable: false, filter: false,
      cellRenderer: (p: any) => `
        <div style="display:flex;gap:4px;align-items:center;height:100%">
          <button id="edit-${p.data.id}" style="background:rgba(99,102,241,0.12);border:none;color:#818cf8;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px">Edit</button>
          <button id="del-${p.data.id}" style="background:rgba(244,63,94,0.1);border:none;color:#fb7185;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px">Delete</button>
        </div>`,
      onCellClicked: (p) => {
        const target = p.event?.target as HTMLElement;
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

  // Metrics
  readonly metrics = computed<MetricCardConfig[]>(() => [
    {
      label: 'Total Assets',
      value: this.state.totalAssetValue(),
      format: 'currency',
      icon: 'account_balance',
      accentColor: '#6366f1',
    },
    {
      label: 'Total Gain/Loss',
      value: this.state.assets().reduce((s, a) => s + a.gain_loss, 0),
      format: 'currency',
      icon: 'trending_up',
      accentColor: '#10b981',
    },
    {
      label: 'Asset Count',
      value: this.state.assets().length,
      format: 'number',
      icon: 'list',
      accentColor: '#06b6d4',
    },
  ]);

  ngOnInit(): void { }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  openCreate(): void {
    this.editingId.set(null);
    this.assetForm.reset({ asset_type: 'bank', growth_rate: 0.07, liquidity_score: 5 });
    this.showForm.set(true);
  }

  openEdit(asset: Asset): void {
    this.editingId.set(asset.id);
    this.assetForm.patchValue({
      name: asset.name,
      asset_type: asset.asset_type,
      current_value: asset.current_value,
      acquisition_value: asset.acquisition_value,
      growth_rate: asset.growth_rate,
      liquidity_score: asset.liquidity_score,
      notes: asset.notes,
    });
    this.showForm.set(true);
  }

  save(): void {
    if (this.assetForm.invalid) return;
    this.saving.set(true);
    const data = this.assetForm.value as Partial<Asset>;
    const id = this.editingId();

    const obs = id ? this.api.updateAsset(id, data) : this.api.createAsset(data);
    obs.subscribe({
      next: (asset) => {
        if (id) this.state.updateAsset(asset);
        else this.state.addAsset(asset);
        this.showForm.set(false);
        this.saving.set(false);
        this.snackbar.open(id ? 'Asset updated' : 'Asset added', 'Close', { duration: 3000 });
      },
      error: () => {
        this.saving.set(false);
        this.snackbar.open('Failed to save asset', 'Close', { duration: 3000 });
      },
    });
  }

  deleteAsset(id: number): void {
    this.api.deleteAsset(id).subscribe({
      next: () => {
        this.state.removeAsset(id);
        this.snackbar.open('Asset deleted', 'Close', { duration: 3000 });
      },
    });
  }

  cancelForm(): void {
    this.showForm.set(false);
  }
}
