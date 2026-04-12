export interface NetWorthSummary {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  asset_by_type: Record<string, number>;
}

export interface CashFlowSummary {
  monthly_income: number;
  monthly_expenses: number;
  monthly_cash_flow: number;
  income_by_type: Record<string, number>;
  expense_by_category: Record<string, number>;
}

export interface EmergencyFundSummary {
  liquid_assets: number;
  monthly_expenses: number;
  months_covered: number;
}

export interface DashboardSummary {
  net_worth: NetWorthSummary;
  cash_flow: CashFlowSummary;
  emergency_fund: EmergencyFundSummary;
  retirement_readiness: number;
  fire_age: number | null;
}
