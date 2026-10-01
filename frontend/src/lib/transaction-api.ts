import type { Transaction, TransactionInput } from '../types/transaction';
import { apiRequest } from './api-client';

export function listTransactions(): Promise<Transaction[]> {
  return apiRequest('/api/transactions', {}, 'Could not load transactions.');
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