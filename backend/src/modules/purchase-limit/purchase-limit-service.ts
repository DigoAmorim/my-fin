import { ApiError } from '../../lib/api-errors';
import { numberToDecimalString } from '../../lib/decimal';
import { asRecord, databaseErrorCode, parsePositiveId } from '../../lib/request-validation';
import { PURCHASE_TYPES, type PurchaseType } from '../transaction/transaction-types';
import * as repository from './purchase-limit-repository';
import type { PurchaseLimitFields } from './purchase-limit-types';

function parseFields(input: unknown): PurchaseLimitFields {
  const body = asRecord(input);

  if (typeof body.purchaseType !== 'string'
    || !PURCHASE_TYPES.some((purchaseType) => purchaseType === body.purchaseType)) {
    throw new ApiError(400, 'purchaseLimitTypeInvalid');
  }

  let amount: string;
  if (typeof body.amount === 'number' && Number.isFinite(body.amount)) {
    amount = numberToDecimalString(body.amount);
  } else if (typeof body.amount === 'string') {
    amount = body.amount.trim();
  } else {
    throw new ApiError(400, 'purchaseLimitAmountInvalid');
  }

  if (!/^\d+(?:\.\d+)?$/.test(amount)) {
    throw new ApiError(400, 'purchaseLimitAmountInvalid');
  }

  const [wholePart, decimalPart = ''] = amount.split('.');
  if (decimalPart.length > 2) {
    throw new ApiError(400, 'purchaseLimitAmountMaxDecimals');
  }

  const whole = wholePart.replace(/^0+(?=\d)/, '');
  if (whole.length > 10) {
    throw new ApiError(400, 'purchaseLimitAmountMaxValue');
  }

  const cents = decimalPart.padEnd(2, '0');
  if (BigInt(whole) === 0n && BigInt(cents) === 0n) {
    throw new ApiError(400, 'purchaseLimitAmountPositive');
  }

  return {
    purchaseType: body.purchaseType as PurchaseType,
    amount: `${whole}.${cents}`,
  };
}

async function withUniqueTypeConflict<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (databaseErrorCode(error) === '23505') {
      throw new ApiError(409, 'purchaseLimitTypeExists');
    }

    throw error;
  }
}

export async function listPurchaseLimits() {
  return repository.findAll();
}

export async function createPurchaseLimit(input: unknown) {
  const body = asRecord(input);
  if (body.id !== undefined) {
    throw new ApiError(400, 'purchaseLimitIdGenerated');
  }

  return withUniqueTypeConflict(() => repository.create(parseFields(body)));
}

export async function updatePurchaseLimit(idInput: unknown, input: unknown) {
  const id = parsePositiveId(idInput);
  const body = asRecord(input);

  if (body.id !== undefined && body.id !== id) {
    throw new ApiError(400, 'purchaseLimitIdImmutable');
  }

  const limit = await withUniqueTypeConflict(() => repository.update(id, parseFields(body)));
  if (!limit) {
    throw new ApiError(404, 'purchaseLimitNotFound');
  }

  return limit;
}

export async function deletePurchaseLimit(idInput: unknown): Promise<void> {
  const id = parsePositiveId(idInput);
  const deleted = await repository.remove(id);

  if (!deleted) {
    throw new ApiError(404, 'purchaseLimitNotFound');
  }
}
