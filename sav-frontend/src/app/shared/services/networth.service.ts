import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Asset } from '../models/asset.model';
import { AssetService } from './asset.service';

@Injectable({ providedIn: 'root' })
export class NetworthService {

    private readonly api = inject(ApiService);
    private readonly assetService = inject(AssetService);

    readonly networth = computed(() => this.assetService.totalAssetValue());


}
