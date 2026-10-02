import type { Transaction, TransactionInput } from '../types/transaction';
import { apiRequest } from './api-client';

export type TransactionPaymentInput = {
  creditCardId: number;
  paymentMonth: string;
  transactionIds: number[];
};

export type TransactionPaymentResult = {
  paidCount: number;
  removedTransactionIds: number[];
  updatedTransactions: Transaction[];
};

export type PaidTransaction = Transaction & {
  sourceTransactionId: number;
  paymentMonth: string;
};

export type PaymentHistory = {
  latestPaymentMonth: string | null;
  paymentMonth: string | null;
  transactions: PaidTransaction[];
};

export function listTransactions(signal?: AbortSignal): Promise<Transaction[]> {
  return apiRequest('/api/transactions', { signal }, 'Could not load transactions.');
}

export function createTransaction(input: TransactionInput): Promise<Transaction> {
  return apiRequest('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTransaction(id: number, input: TransactionInput): Promise<Transaction> {
  return apiRequest(`/api/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteTransaction(id: number): Promise<void> {
  return apiRequest(`/api/transactions/${id}`, {
    method: 'DELETE',
  }, 'Could not delete transaction.');
}

export function payTransactions(input: TransactionPaymentInput): Promise<TransactionPaymentResult> {
  return apiRequest('/api/transactions/payments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getPaymentHistory(
  creditCardId: number,
  month?: string,
  signal?: AbortSignal,
): Promise<PaymentHistory> {
  const params = new URLSearchParams({ creditCardId: String(creditCardId) });
  if (month) params.set('month', month);
  return apiRequest(`/api/transactions/payments?${params}`, { signal });
}