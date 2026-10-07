export type AccountType = 'checking' | 'savings' | 'fixed_income';
export type AccountSource = 'manual' | 'pluggy' | 'pluggy_investment';

export type Account = {
  id: number;
  bankId: number | null;
  bankName: string;
  accountNumber: string;
  balance: string;
  accountType: AccountType;
  updatedAt: string;
  source: AccountSource;
};

export type AccountFields = Pick<
  Account,
  'bankName' | 'accountNumber' | 'accountType' | 'balance' | 'updatedAt'
>;

export type PluggyAccount = {
  id: string;
  number: string;
  subtype: AccountType;
  balance: string;
  updatedAt: string;
};
