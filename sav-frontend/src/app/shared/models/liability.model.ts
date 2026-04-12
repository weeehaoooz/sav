export type LiabilityType = 'mortgage' | 'car_loan' | 'student_loan' | 'credit_card' | 'personal_loan';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'annually';

export interface Liability {
  id: number;
  owner: number;
  owner_name: string;
  name: string;
  liability_type: LiabilityType;
  principal: number;
  outstanding_balance: number;
  interest_rate: number;
  tenure_months: number;
  payment_frequency: PaymentFrequency;
  linked_asset: number | null;
  linked_asset_name: string | null;
  start_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}
