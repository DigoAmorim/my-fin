import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../lib/api-errors';
import { parseTransactionFields } from './transaction-service';

const validFortnightTransaction = {
  creditCardId: 12,
  totalInstallments: 1,
  installmentAmount: '12.3',
  debtor: '  ',
  transactionType: 'purchase',
  description: '  ',
  date: '2026-10-01',
  purchaseType: 'first_fortnight',
};

test('normalizes optional text and keeps installment amount at two decimal places', () => {
  assert.deepEqual(parseTransactionFields(validFortnightTransaction), {
    ...validFortnightTransaction,
    installmentAmount: '12.30',
    debtor: null,
    description: null,
  });
});

test('requires a credit card selection', () => {
  assert.throws(
    () => parseTransactionFields({ ...validFortnightTransaction, creditCardId: '' }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'transactionCreditCardRequired',
  );
});

test('requires debtor for credit transactions', () => {
  assert.throws(
    () => parseTransactionFields({ ...validFortnightTransaction, transactionType: 'credit' }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'transactionDebtorRequiredForCredit',
  );
});

test('limits installment amount to two decimal places', () => {
  assert.throws(
    () => parseTransactionFields({ ...validFortnightTransaction, installmentAmount: '12.345' }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'transactionInstallmentAmountMaxDecimals',
  );
});

test('requires positive installment count and installment amount', () => {
  assert.throws(
    () => parseTransactionFields({ ...validFortnightTransaction, totalInstallments: 0 }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'transactionInstallmentsPositiveInteger',
  );
  assert.throws(
    () => parseTransactionFields({ ...validFortnightTransaction, installmentAmount: '0.00' }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'transactionInstallmentAmountPositive',
  );
});

test('enforces debtor and description character limits', () => {
  assert.throws(
    () => parseTransactionFields({ ...validFortnightTransaction, debtor: 'A'.repeat(21) }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'transactionDebtorMaxLength',
  );
  assert.throws(
    () => parseTransactionFields({ ...validFortnightTransaction, description: 'A'.repeat(51) }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'transactionDescriptionMaxLength',
  );
});

test('requires one installment for either fortnight option', () => {
  assert.throws(
    () => parseTransactionFields({ ...validFortnightTransaction, totalInstallments: 2 }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'transactionFortnightOneInstallment',
  );
});

test('allows one installment for installment plans', () => {
  const transaction = parseTransactionFields({
    ...validFortnightTransaction,
    purchaseType: 'installment_plan',
  });

  assert.equal(transaction.totalInstallments, 1);
  assert.equal(transaction.purchaseType, 'installment_plan');
});

test('rejects impossible calendar dates', () => {
  assert.throws(
    () => parseTransactionFields({ ...validFortnightTransaction, date: '2026-02-30' }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'transactionDateISO',
  );
});

test('rejects year zero, which PostgreSQL DATE does not support', () => {
  assert.throws(
    () => parseTransactionFields({ ...validFortnightTransaction, date: '0000-01-01' }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'transactionDateISO',
  );
});