export const TRANSACTION_TYPES = ['main_card', 'purchase', 'credit'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PURCHASE_TYPES = ['first_fortnight', 'second_fortnight', 'installment_plan'] as const;
export type PurchaseType = (typeof PURCHASE_TYPES)[number];

export interface Transaction {
  id: number;
  creditCardId: number;
  currentInstallment: number;
  totalInstallments: number;
  // Mantem NUMERIC do PostgreSQL como string para preservar a precisao monetaria.
  installmentAmount: string;
  debtor: string | null;
  transactionType: TransactionType;
  description: string | null;
  date: string;
  purchaseType: PurchaseType;
}

export type TransactionFields = Omit<Transaction, 'id' | 'currentInstallment'>;