import { apiRequest } from './api-client';
import type { Payment, PaymentInput } from '../types/payment';

export function listPayments(signal?: AbortSignal): Promise<Payment[]> {
  return apiRequest('/api/payments', { signal }, 'Could not load payments.');
}

export function createPayment(input: PaymentInput): Promise<Payment> {
  return apiRequest('/api/payments', {
    method: 'POST',
    body: JSON.stringify(input),
  }, 'Could not create payment.');
}

export function updatePayment(id: number, input: PaymentInput): Promise<Payment> {
  return apiRequest(`/api/payments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }, 'Could not update payment.');
}

export function deletePayment(id: number): Promise<void> {
  return apiRequest(`/api/payments/${id}`, {
    method: 'DELETE',
  }, 'Could not delete payment.');
}
