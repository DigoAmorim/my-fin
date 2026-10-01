import { ApiError } from './api-errors';

// Reutiliza as validacoes estruturais comuns aos corpos e ids dos endpoints.
export function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ApiError(400, 'requestBodyObject');
  }

  return input as Record<string, unknown>;
}

export function parsePositiveId(input: unknown): number {
  const id = typeof input === 'string' && /^\d+$/.test(input) ? Number(input) : input;

  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
    throw new ApiError(400, 'idPositiveInteger');
  }

  return id;
}

export function databaseErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }

  return undefined;
}