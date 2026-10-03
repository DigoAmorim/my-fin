import type { PurchaseLimit, PurchaseLimitInput } from '../types/purchase-limit';
import { apiRequest } from './api-client';

export function listPurchaseLimits(signal?: AbortSignal): Promise<PurchaseLimit[]> {
  return apiRequest('/api/purchase-limits', { signal }, 'Could not load purchase limits.');
}

export function createPurchaseLimit(input: PurchaseLimitInput): Promise<PurchaseLimit> {
  return apiRequest('/api/purchase-limits', {
    method: 'POST',
    body: JSON.stringify(input),
  }, 'Could not create purchase limit.');
}

export function updatePurchaseLimit(id: number, input: PurchaseLimitInput): Promise<PurchaseLimit> {
  return apiRequest(`/api/purchase-limits/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }, 'Could not update purchase limit.');
}

export function deletePurchaseLimit(id: number): Promise<void> {
  return apiRequest(`/api/purchase-limits/${id}`, {
    method: 'DELETE',
  }, 'Could not delete purchase limit.');
}
