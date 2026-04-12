export type ExpenseCategory = 'fixed' | 'variable' | 'family' | 'lifestyle' | 'one_off';
export type Frequency = 'monthly' | 'quarterly' | 'annually' | 'one_off';

export interface Expense {
  id: number;
  account: number;
  account_name: string;
  shared_with: number[];
  name: string;
  category: ExpenseCategory;
  amount: number;
  frequency: Frequency;
  inflation_rate: number;
  is_active: boolean;
  notes: string;
  monthly_equivalent: number;
  created_at: string;
  updated_at: string;
}
