export type Account = {
  id: number;
  name: string;
  bankName: string;
  pluggyItemId: string | null;
  currentBalance: string;
  balanceUpdatedAt: string;
};

export type AccountInput = Omit<Account, 'id' | 'balanceUpdatedAt'>;
