import { ApiError } from '../../lib/api-errors';
import { numberToDecimalString } from '../../lib/decimal';
import { asRecord, parsePositiveId } from '../../lib/request-validation';
import * as repository from './payment-repository';
import type { PaymentFields } from './payment-types';

const MAX_PAYMENT_AMOUNT = 999_999_999_999.99;

function parsePaymentAmount(input: unknown): string {
  const amount = typeof input === 'number' && Number.isFinite(input)
    ? numberToDecimalString(input)
    : typeof input === 'string'
      ? input.trim()
      : '';
  if (!/^\d+(?:\.\d+)?$/.test(amount)) throw new ApiError(400, 'paymentAmountInvalid');
  const [wholePart, decimalPart = ''] = amount.split('.');
  if (decimalPart.length > 2) throw new ApiError(400, 'paymentAmountMaxDecimals');
  const whole = wholePart.replace(/^0+(?=\d)/, '');
  const normalized = `${whole}.${decimalPart.padEnd(2, '0')}`;
  if (Number(normalized) < 0) throw new ApiError(400, 'paymentAmountInvalid');
  if (Number(normalized) > MAX_PAYMENT_AMOUNT) throw new ApiError(400, 'paymentAmountMaxValue');
  return normalized;
}

function parsePaymentDate(input: unknown): string | null {
  if (input === undefined || input === null || input === '') return null;
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input) || input.startsWith('0000-')) {
    throw new ApiError(400, 'paymentDateISO');
  }
  const date = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input) {
    throw new ApiError(400, 'paymentDateISO');
  }
  return input;
}

export function parsePaymentFields(input: unknown): PaymentFields {
  const body = asRecord(input);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw new ApiError(400, 'paymentNameRequired');
  if (Array.from(name).length > 100) throw new ApiError(400, 'paymentNameMaxLength');

  const accountId = parsePositiveId(body.accountId);
  return {
    name,
    amount: parsePaymentAmount(body.amount),
    date: parsePaymentDate(body.date),
    accountId,
  };
}

export async function listPayments() {
  return repository.findAll();
}

export async function createPayment(input: unknown) {
  const body = asRecord(input);
  if (body.id !== undefined) throw new ApiError(400, 'paymentIdGenerated');
  const fields = parsePaymentFields(body);
  if (!await repository.accountIsEligible(fields.accountId)) {
    throw new ApiError(400, 'paymentAccountInvalid');
  }
  return repository.create(fields);
}

export async function updatePayment(idInput: unknown, input: unknown) {
  const id = parsePositiveId(idInput);
  const body = asRecord(input);
  if (body.id !== undefined && body.id !== id) throw new ApiError(400, 'paymentIdImmutable');
  const fields = parsePaymentFields(body);
  if (!await repository.accountIsEligible(fields.accountId)) {
    throw new ApiError(400, 'paymentAccountInvalid');
  }
  const payment = await repository.update(id, fields);
  if (!payment) throw new ApiError(404, 'paymentNotFound');
  return payment;
}

export async function deletePayment(idInput: unknown): Promise<void> {
  const id = parsePositiveId(idInput);
  if (!await repository.remove(id)) throw new ApiError(404, 'paymentNotFound');
}
