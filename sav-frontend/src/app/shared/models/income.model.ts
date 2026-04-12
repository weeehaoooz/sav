export type IncomeType = 'salary' | 'bonus' | 'dividends' | 'rental' | 'side_income' | 'cpf_contribution' | 'other';
export type Frequency = 'monthly' | 'quarterly' | 'annually' | 'one_off';

export interface Income {
  id: number;
  account: number;
  account_name: string;
  name: string;
  income_type: IncomeType;
  amount: number;
  frequency: Frequency;
  growth_rate: number;
  volatility: number;
  is_active: boolean;
  notes: string;
  monthly_equivalent: number;
  created_at: string;
  updated_at: string;
}
