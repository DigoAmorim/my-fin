import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../lib/api-errors';
import { parsePaymentInput, parsePaymentMonth, parseTransactionFields } from './transaction-service';

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

test('parses a selected card payment month and transaction ids', () => {
  assert.deepEqual(parsePaymentInput({
    creditCardId: 12,
    paymentMonth: '2026-10',
    transactionIds: [2, 4],
  }), {
    creditCardId: 12,
    paymentMonth: '2026-10-01',
    transactionIds: [2, 4],
  });
});

test('requires a valid month and at least one transaction for payment', () => {
  for (const paymentMonth of ['2026-13', '0000-01', '2026-1', '']) {
    assert.throws(
      () => parsePaymentInput({ creditCardId: 12, paymentMonth, transactionIds: [2] }),
      (error: unknown) => error instanceof ApiError && error.messageKey === 'transactionPaymentMonthInvalid',
    );
  }

  assert.throws(
    () => parsePaymentInput({ creditCardId: 12, paymentMonth: '2026-10', transactionIds: [] }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'transactionPaymentSelectionRequired',
  );
});

test('rejects invalid or duplicate transaction ids for payment', () => {
  for (const transactionIds of [[0], [2, 2]]) {
    assert.throws(
      () => parsePaymentInput({ creditCardId: 12, paymentMonth: '2026-10', transactionIds }),
      ApiError,
    );
  }
});
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

test('requires one installment for fortnight and recurring purchase types', () => {
  for (const purchaseType of ['first_fortnight', 'second_fortnight', 'recurring']) {
    assert.throws(
      () => parseTransactionFields({ ...validFortnightTransaction, purchaseType, totalInstallments: 2 }),
      (error: unknown) => error instanceof ApiError && error.messageKey === 'transactionSingleInstallmentRequired',
    );
  }
});

test('allows one installment for recurring purchases', () => {
  const transaction = parseTransactionFields({
    ...validFortnightTransaction,
    purchaseType: 'recurring',
  });

  assert.equal(transaction.totalInstallments, 1);
  assert.equal(transaction.purchaseType, 'recurring');
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

test('accepts an omitted history month and validates a requested month', () => {
  assert.equal(parsePaymentMonth(undefined), null);
  assert.equal(parsePaymentMonth('2026-10'), '2026-10');
  for (const month of ['2026-13', '0000-01', '2026-1', null]) {
    assert.throws(
      () => parsePaymentMonth(month),
      (error: unknown) => error instanceof ApiError && error.messageKey === 'transactionPaymentMonthInvalid',
    );
  }
});