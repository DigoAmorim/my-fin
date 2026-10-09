import { apiRequest } from './api-client';
import type { AccountYield, CreateYieldInput, UpdateYieldInput } from '../types/yield';

export function listYields(signal?: AbortSignal): Promise<AccountYield[]> {
  return apiRequest('/api/yields', { signal }, 'Could not load yields.');
}

export function createYield(input: CreateYieldInput): Promise<AccountYield> {
  return apiRequest('/api/yields', {
    method: 'POST',
    body: JSON.stringify(input),
  }, 'Could not create yield record.');
}

export function updateYield(id: number, input: UpdateYieldInput): Promise<AccountYield> {
  return apiRequest(`/api/yields/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }, 'Could not update yield record.');
}

export function deleteYield(id: number): Promise<void> {
  return apiRequest(`/api/yields/${id}`, {
    method: 'DELETE',
  }, 'Could not delete yield record.');
}
