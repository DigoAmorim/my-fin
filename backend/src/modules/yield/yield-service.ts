import { ApiError } from '../../lib/api-errors';
import { numberToDecimalString } from '../../lib/decimal';
import { asRecord, parsePositiveId } from '../../lib/request-validation';
import * as repository from './yield-repository';
import type { CreateYieldFields, UpdateYieldFields } from './yield-types';

const MAX_YIELD_AMOUNT = 999_999_999_999.99;

function parseYieldAmount(input: unknown): string {
  const amount = typeof input === 'number' && Number.isFinite(input)
    ? numberToDecimalString(input)
    : typeof input === 'string'
      ? input.trim()
      : '';
  if (!/^-?\d+(?:\.\d+)?$/.test(amount)) throw new ApiError(400, 'yieldAmountInvalid');
  const [wholePart, decimalPart = ''] = amount.replace(/^-/, '').split('.');
  if (decimalPart.length > 2) throw new ApiError(400, 'yieldAmountMaxDecimals');
  const whole = wholePart.replace(/^0+(?=\d)/, '');
  const normalized = `${amount.startsWith('-') ? '-' : ''}${whole}.${decimalPart.padEnd(2, '0')}`;
  if (Math.abs(Number(normalized)) > MAX_YIELD_AMOUNT) {
    throw new ApiError(400, 'yieldAmountMaxValue');
  }
  return Number(normalized) === 0 ? '0.00' : normalized;
}

function parseAutomatic(input: unknown): boolean {
  if (typeof input !== 'boolean') throw new ApiError(400, 'yieldAutomaticInvalid');
  return input;
}

export function parseCreateYieldFields(input: unknown): CreateYieldFields {
  const body = asRecord(input);
  if (body.id !== undefined) throw new ApiError(400, 'yieldIdGenerated');
  return {
    accountId: parsePositiveId(body.accountId),
    isAutomatic: parseAutomatic(body.isAutomatic),
  };
}

export function parseUpdateYieldFields(input: unknown): UpdateYieldFields {
  const body = asRecord(input);
  const isAutomatic = parseAutomatic(body.isAutomatic);
  return {
    isAutomatic,
    amount: isAutomatic ? '0.00' : parseYieldAmount(body.amount),
  };
}

export async function listYields() {
  return repository.findAll();
}

export async function createYield(input: unknown) {
  const fields = parseCreateYieldFields(input);
  const accountYield = await repository.create(fields).catch((error: unknown) => {
    if (error instanceof repository.DuplicateAccountYieldError) {
      throw new ApiError(409, 'yieldAccountAlreadyExists');
    }
    throw error;
  });
  if (!accountYield) throw new ApiError(400, 'yieldAccountInvalid');
  return accountYield;
}

export async function updateYield(idInput: unknown, input: unknown) {
  const id = parsePositiveId(idInput);
  const body = asRecord(input);
  if (body.id !== undefined && body.id !== id) throw new ApiError(400, 'yieldIdImmutable');
  const accountYield = await repository.update(id, parseUpdateYieldFields(body));
  if (!accountYield) throw new ApiError(404, 'yieldNotFound');
  return accountYield;
}

export async function deleteYield(idInput: unknown): Promise<void> {
  const id = parsePositiveId(idInput);
  if (!await repository.remove(id)) throw new ApiError(404, 'yieldNotFound');
}
