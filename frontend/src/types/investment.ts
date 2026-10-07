export type Investment = {
  id: number;
  bankId: number | null;
  bankName: string;
  subtype: string;
  amount: string;
  updatedAt: string;
  source: 'manual' | 'pluggy_investment';
};

export type InvestmentSummary = {
  total: string;
  investments: Investment[];
};
