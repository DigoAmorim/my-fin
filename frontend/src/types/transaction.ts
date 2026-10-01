export type TransactionType = 'main_card' | 'purchase' | 'credit';
export type PurchaseType = 'first_fortnight' | 'second_fortnight' | 'installment_plan';

export type Transaction = {
  id: number;
  creditCardId: number;
  currentInstallment: number;
  totalInstallments: number;
  installmentAmount: string;
  debtor: string | null;
  transactionType: TransactionType;
  description: string | null;
  date: string;
  purchaseType: PurchaseType;
};

export type TransactionInput = Omit<Transaction, 'id' | 'currentInstallment'>;

export type TransactionFormValues = Omit<
  TransactionInput,
  'creditCardId' | 'totalInstallments' | 'debtor' | 'description'
> & {
  creditCardId: string;
  totalInstallments: string;
  debtor: string;
  description: string;
};