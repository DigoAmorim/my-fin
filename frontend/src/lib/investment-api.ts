import { apiRequest } from './api-client';
import type { InvestmentSummary } from '../types/investment';

export function getInvestmentSummary(signal?: AbortSignal): Promise<InvestmentSummary> {
  return apiRequest('/api/investments', { signal }, 'Could not load fixed income.');
}

export function deleteInvestment(id: number): Promise<void> {
  return apiRequest(`/api/investments/${id}`, {
    method: 'DELETE',
  }, 'Could not remove investment.');
}
