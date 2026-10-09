import type { AccountType } from '../account/account-types';

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

export type CreateYieldFields = {
  accountId: number;
  isAutomatic: boolean;
};

export type UpdateYieldFields = {
  isAutomatic: boolean;
  amount: string;
};
