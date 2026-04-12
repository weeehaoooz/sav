export type AssetType = 'cpf' | 'bank' | 'equity' | 'property' | 'crypto' | 'insurance' | 'alternatives';

export interface AssetOwnership {
  id: number;
  account: number;
  account_name: string;
  ownership_percentage: number;
}

export interface Asset {
  id: number;
  name: string;
  asset_type: AssetType;
  current_value: number;
  acquisition_value: number;
  growth_rate: number;
  liquidity_score: number;
  notes: string;
  ownerships: AssetOwnership[];
  gain_loss: number;
  gain_loss_pct: number;
  created_at: string;
  updated_at: string;
}
