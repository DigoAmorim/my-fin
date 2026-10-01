import i18n from '../i18n';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Compartilha cabeçalhos, idioma e extração de erros entre os módulos da API.
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  fallbackError = 'Request failed.',
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept-Language', i18n.resolvedLanguage ?? i18n.language);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : fallbackError;
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}