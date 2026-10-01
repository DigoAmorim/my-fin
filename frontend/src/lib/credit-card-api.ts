import type { CreditCard, CreditCardForm } from '../types/credit-card';
import { apiRequest } from './api-client';

export function listCreditCards(): Promise<CreditCard[]> {
  return apiRequest('/api/credit-cards', {}, 'Could not load credit cards.');
}

export function createCreditCard(input: CreditCardForm): Promise<CreditCard> {
  return apiRequest('/api/credit-cards', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateCreditCard(id: number, input: CreditCardForm): Promise<CreditCard> {
  return apiRequest(`/api/credit-cards/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteCreditCard(id: number): Promise<void> {
  return apiRequest(`/api/credit-cards/${id}`, {
    method: 'DELETE',
  }, 'Delete failed.');
}
