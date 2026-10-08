export type VariableIncomePosition = {
  id: number;
  assetName: string;
  quantity: string;
  unitValue: string;
  amount: string;
  updatedAt: string;
};

export type PluggyVariableIncomePosition = {
  id: string;
  assetName: string;
  type: 'EQUITY';
  quantity: string;
  unitValue: string;
  amount: string;
  updatedAt: string;
};

export type VariableIncomeSummary = {
  total: string;
  investments: VariableIncomePosition[];
};
