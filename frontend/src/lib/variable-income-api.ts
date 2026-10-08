import { apiRequest } from './api-client';
import type { VariableIncomeSummary } from '../types/variable-income';

export function getVariableIncomeSummary(signal?: AbortSignal): Promise<VariableIncomeSummary> {
  return apiRequest('/api/variable-investments', { signal }, 'Could not load variable income.');
}

export function deleteVariableIncomeInvestment(id: number): Promise<void> {
  return apiRequest(`/api/variable-investments/${id}`, {
    method: 'DELETE',
  }, 'Could not remove variable-income investment.');
}
