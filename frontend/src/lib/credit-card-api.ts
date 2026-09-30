import type { CreditCard, CreditCardForm } from '../types/credit-card';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function listCreditCards(): Promise<CreditCard[]> {
  const response = await fetch(`${API_BASE}/api/credit-cards`);

  if (!response.ok) {
    throw new Error('Could not load credit cards.');
  }

  return response.json();
}

export async function createCreditCard(input: CreditCardForm): Promise<CreditCard> {
  const response = await fetch(`${API_BASE}/api/credit-cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Unexpected server error.' }));
    throw new Error(body.error ?? 'Request failed.');
  }

  return response.json();
}

export async function updateCreditCard(id: number, input: CreditCardForm): Promise<CreditCard> {
  const response = await fetch(`${API_BASE}/api/credit-cards/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Unexpected server error.' }));
    throw new Error(body.error ?? 'Request failed.');
  }

  return response.json();
}

export async function deleteCreditCard(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/credit-cards/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Delete failed.' }));
    throw new Error(body.error ?? 'Delete failed.');
  }
}
