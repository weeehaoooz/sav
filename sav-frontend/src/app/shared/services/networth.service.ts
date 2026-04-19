import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Asset } from '../models/asset.model';
import { AssetService } from './asset.service';
import { UserService } from './user.service';
import { DashboardService } from './dashboard.service';

@Injectable({ providedIn: 'root' })
export class NetworthService {

    private readonly api = inject(ApiService);
    private readonly assetService = inject(AssetService);
    private readonly userService = inject(UserService);
    private readonly dashboardService = inject(DashboardService);

    readonly networth = computed(() => {
        const acc = this.userService.selectedAccount();
        if (!acc) return this.assetService.totalAssetValue();

        // If we have a dashboard summary for the selected account, use that as it's the source of truth
        const d = this.dashboardService.dashboard();
        if (d && d.net_worth) return d.net_worth.net_worth;

        // Fallback to local calculation if dashboard not loaded
        const assets = this.assetService.assets();
        let total = 0;
        for (const a of assets) {
            const ownership = a.ownerships.find(o => o.account === acc.id)?.ownership_percentage ?? 0;
            total += Number(a.current_value) * (ownership / 100);
        }
        return total;
    });


}
