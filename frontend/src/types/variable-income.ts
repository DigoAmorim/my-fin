export type VariableIncomeInvestment = {
  id: number;
  assetName: string;
  quantity: string;
  unitValue: string;
  amount: string;
  updatedAt: string;
};

export type VariableIncomeSummary = {
  total: string;
  investments: VariableIncomeInvestment[];
};
