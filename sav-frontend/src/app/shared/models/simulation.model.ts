export interface RetirementProjectionPoint {
  age: number;
  year: number;
  net_worth: number;
  is_retired: boolean;
}

export interface RetirementResult {
  projections: RetirementProjectionPoint[];
  readiness_score: number;
  target_nest_egg: number;
  projected_at_retirement: number;
  fire_age: number | null;
  years_to_fire: number | null;
}

export interface AmortisationPeriod {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}
