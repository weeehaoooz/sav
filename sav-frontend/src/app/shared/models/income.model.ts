export type IncomeType = 'salary' | 'bonus' | 'dividends' | 'rental' | 'side_income' | 'cpf_contribution' | 'other';
export type Frequency = 'monthly' | 'quarterly' | 'annually' | 'one_off';

export interface Income {
  id: number;
  account: number;
  account_name: string;
  name: string;
  income_type: IncomeType;
  company?: string;
  has_cpf: boolean;
  amount: number;
  frequency: Frequency;
  is_active: boolean;
  notes: string;
  monthly_equivalent: number;
  dob: string | null;
  take_home_amount: number;
  additional_contributions: number;
  cpf_rate: {
    employer: number;
    employee: number;
    total: number;
  } | null;
  created_at: string;
  updated_at: string;
}
