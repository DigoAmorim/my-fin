export type FixedIncomePosition = {
  id: number;
  bankId: number | null;
  bankName: string;
  subtype: string;
  amount: string;
  updatedAt: string;
  source: 'manual' | 'pluggy_investment';
};

export type PluggyFixedIncomePosition = {
  id: string;
  subtype: string;
  amount: string;
  updatedAt: string;
};

export type FixedIncomeSummary = {
  total: string;
  investments: FixedIncomePosition[];
};