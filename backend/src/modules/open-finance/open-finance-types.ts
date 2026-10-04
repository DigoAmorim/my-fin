export type OpenFinanceBank = {
  id: number;
  bankName: string;
  checkingAccount: boolean;
  savingsAccount: boolean;
  fixedIncome: boolean;
  variableIncome: boolean;
  pluggyItemId: string;
};

export type OpenFinanceBankFields = Omit<OpenFinanceBank, 'id'>;
