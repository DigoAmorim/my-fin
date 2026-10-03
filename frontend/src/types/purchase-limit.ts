import type { PurchaseType } from './transaction';

export type PurchaseLimit = {
  id: number;
  purchaseType: PurchaseType;
  amount: string;
};

export type PurchaseLimitInput = Omit<PurchaseLimit, 'id'>;
