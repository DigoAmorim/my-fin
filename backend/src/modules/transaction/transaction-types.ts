export const TRANSACTION_TYPES = ['main_card', 'purchase', 'credit'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PURCHASE_TYPES = ['first_fortnight', 'second_fortnight', 'installment_plan', 'recurring'] as const;
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

export interface PaymentInput {
  creditCardId: number;
  paymentMonth: string;
  transactionIds: number[];
}

export interface PaymentResult {
  paidCount: number;
  removedTransactionIds: number[];
  updatedTransactions: Transaction[];
}

export interface PaidTransaction extends Transaction {
  sourceTransactionId: number;
  paymentMonth: string;
}

export interface PaymentHistory {
  latestPaymentMonth: string | null;
  paymentMonth: string | null;
  transactions: PaidTransaction[];
}