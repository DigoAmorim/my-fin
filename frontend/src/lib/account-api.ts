import { apiRequest } from './api-client';
import type { Account, AccountInput } from '../types/account';

export type RefreshAccountsResult = {
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  failedAccounts: string[];
  updatedAccounts: Account[];
};

export function listAccounts(signal?: AbortSignal): Promise<Account[]> {
  return apiRequest('/api/accounts', { signal }, 'Could not load accounts.');
}

export function refreshAccounts(): Promise<RefreshAccountsResult> {
  return apiRequest('/api/accounts/refresh', { method: 'POST' }, 'Could not refresh accounts.');
}

export function createAccount(input: AccountInput): Promise<Account> {
  return apiRequest('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAccount(id: number, input: AccountInput): Promise<Account> {
  return apiRequest(`/api/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteAccount(id: number): Promise<void> {
  return apiRequest(`/api/accounts/${id}`, { method: 'DELETE' }, 'Delete failed.');
}
