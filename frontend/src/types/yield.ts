import type { AccountType } from './account';

export type AccountYield = {
  id: number;
  accountId: number;
  bankName: string;
  accountNumber: string;
  accountType: AccountType;
  previousBalance: string;
  currentBalance: string;
  amount: string;
  isAutomatic: boolean;
  createdAt: string;
};

export type CreateYieldInput = {
  accountId: number;
  isAutomatic: boolean;
};

export type UpdateYieldInput = {
  isAutomatic: boolean;
  amount: string;
};
