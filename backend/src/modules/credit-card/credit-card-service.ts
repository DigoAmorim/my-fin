// Este modulo valida entradas, coordena as operacoes e traduz erros do banco.
import * as repository from './credit-card-repository';
import type { CreditCard, CreditCardFields } from './credit-card-types';

export class CreditCardServiceError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'CreditCardServiceError';
  }
}

function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new CreditCardServiceError(400, 'Request body must be a JSON object.');
  }

  return input as Record<string, unknown>;
}

function parseId(input: unknown): number {
  const id = typeof input === 'string' && /^\d+$/.test(input) ? Number(input) : input;

  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
    throw new CreditCardServiceError(400, 'id must be a positive integer.');
  }

  return id;
}

// Valida e normaliza os campos mutaveis antes de envia-los ao repository.
function parseFields(input: unknown): CreditCardFields {
  const body = asRecord(input);
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (name.length === 0) {
    throw new CreditCardServiceError(400, 'name must be a non-empty string.');
  }

  if (Array.from(name).length > 20) {
    throw new CreditCardServiceError(400, 'name must have at most 20 characters.');
  }

  if (typeof body.dueDay !== 'number' || !Number.isInteger(body.dueDay) || body.dueDay < 1 || body.dueDay > 31) {
    throw new CreditCardServiceError(400, 'dueDay must be an integer between 1 and 31.');
  }

  return { name, dueDay: body.dueDay };
}

function databaseErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }

  return undefined;
}

export async function listCreditCards(): Promise<CreditCard[]> {
  return repository.findAll();
}

export async function getCreditCard(idInput: unknown): Promise<CreditCard> {
  const id = parseId(idInput);
  const creditCard = await repository.findById(id);

  if (!creditCard) {
    throw new CreditCardServiceError(404, 'Credit card not found.');
  }

  return creditCard;
}

export async function createCreditCard(input: unknown): Promise<CreditCard> {
  const body = asRecord(input);
  if (body.id !== undefined) {
    throw new CreditCardServiceError(400, 'id is generated and cannot be set.');
  }

  return repository.create(parseFields(body));
}

export async function updateCreditCard(idInput: unknown, input: unknown): Promise<CreditCard> {
  const id = parseId(idInput);
  const body = asRecord(input);

  if (body.id !== undefined && body.id !== id) {
    throw new CreditCardServiceError(400, 'id cannot be changed.');
  }

  const fields = parseFields(body);
  const creditCard = await repository.update(id, fields);

  if (!creditCard) {
    throw new CreditCardServiceError(404, 'Credit card not found.');
  }

  return creditCard;
}

export async function deleteCreditCard(idInput: unknown): Promise<void> {
  const id = parseId(idInput);

  try {
    const deleted = await repository.remove(id);

    if (!deleted) {
      throw new CreditCardServiceError(404, 'Credit card not found.');
    }
  } catch (error) {
    // O SQLSTATE 23503 indica que uma chave estrangeira impede a exclusao.
    if (databaseErrorCode(error) === '23503') {
      throw new CreditCardServiceError(409, 'Credit card is referenced by other records and cannot be deleted.');
    }

    throw error;
  }
}