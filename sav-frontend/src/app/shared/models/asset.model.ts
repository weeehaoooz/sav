export type AssetType =
  | 'bank'
  | 'equity'
  | 'cpf';

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
  currency: string;
  valuation_date: string;
  cpf_oa: number;
  cpf_sa: number;
  cpf_ma: number;
  cpf_ra: number;
  ownerships: AssetOwnership[];
  ytd_gain_loss: number;
  ytd_gain_loss_pct: number;
  gain_loss: number;
  gain_loss_pct: number;
  created_at: string;
  updated_at: string;
}

export interface AssetValuationHistory {
  id: number;
  asset: number;
  valuation_date: string;
  current_value: number;
  cpf_oa: number;
  cpf_sa: number;
  cpf_ma: number;
  cpf_ra: number;
  created_at: string;
}
