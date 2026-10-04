import { apiRequest } from './api-client';
import type { OpenFinanceBank, OpenFinanceBankInput } from '../types/open-finance';

export function listOpenFinanceBanks(signal?: AbortSignal): Promise<OpenFinanceBank[]> {
  return apiRequest('/api/open-finance/banks', { signal }, 'Could not load Open Finance banks.');
}

export function createOpenFinanceBank(input: OpenFinanceBankInput): Promise<OpenFinanceBank> {
  return apiRequest('/api/open-finance/banks', {
    method: 'POST',
    body: JSON.stringify(input),
  }, 'Could not create Open Finance bank.');
}

export function updateOpenFinanceBank(
  id: number,
  input: OpenFinanceBankInput,
): Promise<OpenFinanceBank> {
  return apiRequest(`/api/open-finance/banks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }, 'Could not update Open Finance bank.');
}

export function deleteOpenFinanceBank(id: number): Promise<void> {
  return apiRequest(`/api/open-finance/banks/${id}`, {
    method: 'DELETE',
  }, 'Could not delete Open Finance bank.');
}
