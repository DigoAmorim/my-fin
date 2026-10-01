import { ApiError } from '../../lib/api-errors';
import { asRecord, databaseErrorCode, parsePositiveId } from '../../lib/request-validation';
import * as repository from './transaction-repository';
import {
  PURCHASE_TYPES,
  TRANSACTION_TYPES,
  type PurchaseType,
  type Transaction,
  type TransactionFields,
  type TransactionType,
} from './transaction-types';

function parseInstallmentAmount(input: unknown): string {
  // Aceita decimal como string para manter precisao; numeros JSON continuam suportados.
  let value: string;
  if (typeof input === 'number' && Number.isFinite(input)) {
    value = numberToDecimalString(input);
  } else if (typeof input === 'string') {
    value = input.trim();
  } else {
    throw new ApiError(400, 'transactionInstallmentAmountInvalid');
  }

  if (!/^\d+(?:\.\d+)?$/.test(value)) {
    throw new ApiError(400, 'transactionInstallmentAmountInvalid');
  }

  const [wholePart, decimalPart = ''] = value.split('.');
  if (decimalPart.length > 2) {
    throw new ApiError(400, 'transactionInstallmentAmountMaxDecimals');
  }

  const whole = wholePart.replace(/^0+(?=\d)/, '');
  const cents = decimalPart.padEnd(2, '0');
  if (BigInt(whole) === 0n && BigInt(cents) === 0n) {
    throw new ApiError(400, 'transactionInstallmentAmountPositive');
  }

  return `${whole}.${cents}`;
}

function numberToDecimalString(value: number): string {
  const text = String(value);
  if (!/[eE]/.test(text)) return text;

  const [coefficient, exponentText] = text.toLowerCase().split('e');
  const exponent = Number(exponentText);
  const [whole, fraction = ''] = coefficient.split('.');
  const digits = whole + fraction;
  const decimalPosition = whole.length + exponent;

  if (decimalPosition <= 0) return `0.${'0'.repeat(-decimalPosition)}${digits}`;
  if (decimalPosition >= digits.length) return `${digits}${'0'.repeat(decimalPosition - digits.length)}`;
  return `${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`;
}

function parseOptionalText(input: unknown, field: 'debtor' | 'description'): string | null {
  if (input === undefined || input === null) return null;

  const invalidMessage = field === 'debtor' ? 'transactionDebtorInvalid' : 'transactionDescriptionInvalid';
  if (typeof input !== 'string') throw new ApiError(400, invalidMessage);

  const value = input.trim();
  if (!value) return null;

  const length = Array.from(value).length;
  const maxLength = field === 'debtor' ? 20 : 50;
  if (length > maxLength) {
    throw new ApiError(400, field === 'debtor' ? 'transactionDebtorMaxLength' : 'transactionDescriptionMaxLength');
  }

  return value;
}

function parseTransactionType(input: unknown): TransactionType {
  if (typeof input !== 'string' || !TRANSACTION_TYPES.some((type) => type === input)) {
    throw new ApiError(400, 'transactionTypeInvalid');
  }

  return input as TransactionType;
}

function parsePurchaseType(input: unknown): PurchaseType {
  if (typeof input !== 'string' || !PURCHASE_TYPES.some((type) => type === input)) {
    throw new ApiError(400, 'transactionPurchaseTypeInvalid');
  }

  return input as PurchaseType;
}

function parseDate(input: unknown): string {
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input) || input.startsWith('0000-')) {
    throw new ApiError(400, 'transactionDateISO');
  }

  const date = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input) {
    throw new ApiError(400, 'transactionDateISO');
  }

  return input;
}

export function parseTransactionFields(input: unknown): TransactionFields {
  const body = asRecord(input);
  if (body.creditCardId === undefined || body.creditCardId === null || body.creditCardId === '') {
    throw new ApiError(400, 'transactionCreditCardRequired');
  }

  const creditCardId = parsePositiveId(body.creditCardId);
  const totalInstallments = body.totalInstallments;
  if (typeof totalInstallments !== 'number' || !Number.isSafeInteger(totalInstallments) || totalInstallments < 1) {
    throw new ApiError(400, 'transactionInstallmentsPositiveInteger');
  }

  const debtor = parseOptionalText(body.debtor, 'debtor');
  const transactionType = parseTransactionType(body.transactionType);
  const purchaseType = parsePurchaseType(body.purchaseType);

  if (transactionType === 'credit' && !debtor) {
    throw new ApiError(400, 'transactionDebtorRequiredForCredit');
  }
  if (purchaseType !== 'installment_plan' && totalInstallments !== 1) {
    throw new ApiError(400, 'transactionFortnightOneInstallment');
  }

  return {
    creditCardId,
    totalInstallments,
    installmentAmount: parseInstallmentAmount(body.installmentAmount),
    debtor,
    transactionType,
    description: parseOptionalText(body.description, 'description'),
    date: parseDate(body.date),
    purchaseType,
  };
}

function translateForeignKeyError(error: unknown): never {
  if (databaseErrorCode(error) === '23503') {
    throw new ApiError(404, 'transactionCreditCardNotFound');
  }

  throw error;
}

export async function listTransactions(): Promise<Transaction[]> {
  return repository.findAll();
}

export async function getTransaction(idInput: unknown): Promise<Transaction> {
  const id = parsePositiveId(idInput);
  const transaction = await repository.findById(id);

  if (!transaction) throw new ApiError(404, 'transactionNotFound');
  return transaction;
}

export async function createTransaction(input: unknown): Promise<Transaction> {
  const body = asRecord(input);
  if (body.id !== undefined) throw new ApiError(400, 'transactionIdGenerated');

  const fields = parseTransactionFields(body);

  try {
    return await repository.create(fields);
  } catch (error) {
    translateForeignKeyError(error);
  }
}

export async function updateTransaction(idInput: unknown, input: unknown): Promise<Transaction> {
  const id = parsePositiveId(idInput);
  const body = asRecord(input);
  if (body.id !== undefined && body.id !== id) throw new ApiError(400, 'transactionIdImmutable');

  const fields = parseTransactionFields(body);

  try {
    const transaction = await repository.update(id, fields);
    if (!transaction) throw new ApiError(404, 'transactionNotFound');
    return transaction;
  } catch (error) {
    translateForeignKeyError(error);
  }
}

export async function deleteTransaction(idInput: unknown): Promise<void> {
  const id = parsePositiveId(idInput);
  const deleted = await repository.remove(id);

  if (!deleted) throw new ApiError(404, 'transactionNotFound');
}