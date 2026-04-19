export type IncomeType = 'employment' | 'bonus' | 'dividends' | 'rental' | 'side_income' | 'cpf_contribution' | 'other';
export type Frequency = 'monthly' | 'quarterly' | 'annually' | 'one_off';

export interface Income {
  id: number;
  name: string;
  account: number;
  income_type: IncomeType;
  company?: string;
  has_cpf: boolean;
  amount: number;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Bonus {
  id?: number;
  month: number;
  amount: number;
}

export interface Employment extends Income {
  company?: string;
  has_cpf: boolean;
  start_dt: string;
  end_dt?: string | null;
  monthly: number;
  average_growth_rate: number;
  bonuses: Bonus[];
}