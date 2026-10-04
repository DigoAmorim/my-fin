export interface Account {
  id: number;
  name: string;
  bankName: string;
  pluggyItemId: string | null;
  currentBalance: string;
  balanceUpdatedAt: string;
}

export type AccountFields = Omit<Account, 'id' | 'balanceUpdatedAt'>;
