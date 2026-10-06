import { apiRequest } from './api-client';
import type { Account, ManualAccountInput } from '../types/account';

export function listAccounts(signal?: AbortSignal): Promise<Account[]> {
  return apiRequest('/api/accounts', { signal }, 'Could not load accounts.');
}

export function createManualAccount(input: ManualAccountInput): Promise<Account> {
  return apiRequest('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(input),
  }, 'Could not create account.');
}

export function updateManualAccount(id: number, input: ManualAccountInput): Promise<Account> {
  return apiRequest(`/api/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }, 'Could not update account.');
}

export function deleteAccount(id: number): Promise<void> {
  return apiRequest(`/api/accounts/${id}`, {
    method: 'DELETE',
  }, 'Could not delete account.');
}
