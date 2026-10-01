// Este modulo valida entradas, coordena as operacoes e traduz erros do banco.
import * as repository from './credit-card-repository';
import { ApiError } from '../../lib/api-errors';
import { asRecord, databaseErrorCode, parsePositiveId } from '../../lib/request-validation';
import type { CreditCard, CreditCardFields } from './credit-card-types';

// Valida e normaliza os campos mutaveis antes de envia-los ao repository.
function parseFields(input: unknown): CreditCardFields {
  const body = asRecord(input);
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (name.length === 0) {
    throw new ApiError(400, 'creditCardNameRequired');
  }

  if (Array.from(name).length > 20) {
    throw new ApiError(400, 'creditCardNameMaxLength');
  }

  if (typeof body.dueDay !== 'number' || !Number.isInteger(body.dueDay) || body.dueDay < 1 || body.dueDay > 31) {
    throw new ApiError(400, 'creditCardDueDayRange');
  }

  return { name, dueDay: body.dueDay };
}

export async function listCreditCards(): Promise<CreditCard[]> {
  return repository.findAll();
}

export async function getCreditCard(idInput: unknown): Promise<CreditCard> {
  const id = parsePositiveId(idInput);
  const creditCard = await repository.findById(id);

  if (!creditCard) {
    throw new ApiError(404, 'creditCardNotFound');
  }

  return creditCard;
}

export async function createCreditCard(input: unknown): Promise<CreditCard> {
  const body = asRecord(input);
  if (body.id !== undefined) {
    throw new ApiError(400, 'creditCardIdGenerated');
  }

  return repository.create(parseFields(body));
}

export async function updateCreditCard(idInput: unknown, input: unknown): Promise<CreditCard> {
  const id = parsePositiveId(idInput);
  const body = asRecord(input);

  if (body.id !== undefined && body.id !== id) {
    throw new ApiError(400, 'creditCardIdImmutable');
  }

  const fields = parseFields(body);
  const creditCard = await repository.update(id, fields);

  if (!creditCard) {
    throw new ApiError(404, 'creditCardNotFound');
  }

  return creditCard;
}

export async function deleteCreditCard(idInput: unknown): Promise<void> {
  const id = parsePositiveId(idInput);

  try {
    const deleted = await repository.remove(id);

    if (!deleted) {
      throw new ApiError(404, 'creditCardNotFound');
    }
  } catch (error) {
    // O SQLSTATE 23503 indica que uma chave estrangeira impede a exclusao.
    if (databaseErrorCode(error) === '23503') {
      throw new ApiError(409, 'creditCardReferenced');
    }

    throw error;
  }
}