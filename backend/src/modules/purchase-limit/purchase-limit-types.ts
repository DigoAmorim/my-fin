import type { PurchaseType } from '../transaction/transaction-types';

export type PurchaseLimit = {
  id: number;
  purchaseType: PurchaseType;
  amount: string;
};

export type PurchaseLimitFields = Omit<PurchaseLimit, 'id'>;
