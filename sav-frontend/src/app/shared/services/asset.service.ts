import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Asset } from '../models/asset.model';

@Injectable({ providedIn: 'root' })
export class AssetService {
  private readonly api = inject(ApiService);

  private readonly _assets = signal<Asset[]>([]);
  readonly assets = computed(() => 
    [...this._assets()].sort((a, b) => new Date(b.valuation_date).getTime() - new Date(a.valuation_date).getTime())
  );

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly totalAssetValue = computed(() =>
    this._assets().reduce((sum, a) => sum + (Number(a.current_value) || 0), 0)
  );

  readonly assetsByType = computed(() => {
    const grouped: Record<string, Asset[]> = {};
    for (const asset of this._assets()) {
      (grouped[asset.asset_type] ??= []).push(asset);
    }
    return grouped;
  });

  loadAssets(): void {
    this.loading.set(true);
    this.api.getAssets().subscribe({
      next: (data) => {
        this._assets.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load assets');
        this.loading.set(false);
      }
    });
  }

  addAsset(asset: Asset): void {
    this._assets.update(list => [asset, ...list]);
  }

  updateAsset(updated: Asset): void {
    this._assets.update(list => list.map(a => a.id === updated.id ? updated : a));
  }

  removeAsset(id: number): void {
    this._assets.update(list => list.filter(a => a.id !== id));
  }
}
