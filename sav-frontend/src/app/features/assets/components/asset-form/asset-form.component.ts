import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Asset, AssetType } from '../../../../shared/models/asset.model';
import { BankAssetFormComponent } from '../bank-asset-form/bank-asset-form.component';
import { EquityAssetFormComponent } from '../equity-asset-form/equity-asset-form.component';
import { CpfAssetFormComponent } from '../cpf-asset-form/cpf-asset-form.component';

@Component({
  selector: 'app-asset-form',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    BankAssetFormComponent,
    EquityAssetFormComponent,
    CpfAssetFormComponent
  ],
  templateUrl: './asset-form.component.html',
  styleUrls: ['./asset-form.component.scss']
})
export class AssetFormComponent {
  private _asset: Asset | null = null;
  readonly selectedType = signal<AssetType>('bank');

  @Input() set asset(value: Asset | null) {
    this._asset = value;
    if (value) {
      this.selectedType.set(value.asset_type);
    } else {
      this.selectedType.set('bank');
    }
  }
  get asset(): Asset | null { return this._asset; }

  @Input() saving = false;

  @Output() save = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  readonly assetTypes: { value: AssetType; label: string; icon: string }[] = [
    { value: 'bank', label: 'Bank Account', icon: 'account_balance' },
    { value: 'equity', label: 'Equities / Investments', icon: 'trending_up' },
    { value: 'cpf', label: 'CPF Accounts', icon: 'shield' },
  ];

  onTypeChange(type: AssetType) {
    this.selectedType.set(type);
  }

  onSave(data: any) {
    this.save.emit(data);
  }
}
