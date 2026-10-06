export type AccountType = 'checking' | 'savings';
export type AccountSource = 'manual' | 'pluggy';

export type Account = {
  id: number;
  bankId: number | null;
  bankName: string;
  accountNumber: string;
  accountType: AccountType;
  balance: string;
  updatedAt: string;
  source: AccountSource;
};

export type ManualAccountInput = Pick<
  Account,
  'bankName' | 'accountNumber' | 'accountType' | 'balance'
> & { updatedAt: string };
