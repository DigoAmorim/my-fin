import type { PurchaseType, TransactionType } from '../types/transaction';

export const transactionTypeLabelKeys: Record<TransactionType, string> = {
  main_card: 'transactions.types.mainCard',
  purchase: 'transactions.types.purchase',
  credit: 'transactions.types.credit',
};

export const purchaseTypeLabelKeys: Record<PurchaseType, string> = {
  first_fortnight: 'transactions.purchaseTypes.firstFortnight',
  second_fortnight: 'transactions.purchaseTypes.secondFortnight',
  installment_plan: 'transactions.purchaseTypes.installmentPlan',
  recurring: 'transactions.purchaseTypes.recurring',
};