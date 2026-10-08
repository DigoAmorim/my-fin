import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../lib/api-errors';
import { parsePaymentFields } from './payment-service';

const validPayment = {
  name: '  Aluguel  ',
  amount: '1250.5',
  date: '2026-10-10',
  accountId: 2,
};

test('normalizes payment name and amount', () => {
  assert.deepEqual(parsePaymentFields(validPayment), {
    name: 'Aluguel',
    amount: '1250.50',
    date: '2026-10-10',
    accountId: 2,
  });
});

test('accepts a zero amount and an omitted payment date', () => {
  const parsed = parsePaymentFields({
    ...validPayment,
    amount: '0',
    date: '',
  });
  assert.deepEqual(parsed, {
    name: 'Aluguel',
    amount: '0.00',
    date: null,
    accountId: 2,
  });
  assert.equal(parsePaymentFields({
    name: 'Aluguel',
    amount: 0,
    accountId: 2,
  }).date, null);
});

test('validates payment name, amount, date, and account id', () => {
  const invalidCases: Array<[Record<string, unknown>, string]> = [
    [{ ...validPayment, name: ' ' }, 'paymentNameRequired'],
    [{ ...validPayment, name: 'P'.repeat(101) }, 'paymentNameMaxLength'],
    [{ ...validPayment, amount: '-1' }, 'paymentAmountInvalid'],
    [{ ...validPayment, amount: '1.001' }, 'paymentAmountMaxDecimals'],
    [{ ...validPayment, amount: '1,25' }, 'paymentAmountInvalid'],
    [{ ...validPayment, date: '2026-02-30' }, 'paymentDateISO'],
    [{ ...validPayment, accountId: 0 }, 'idPositiveInteger'],
  ];
  for (const [input, messageKey] of invalidCases) {
    assert.throws(
      () => parsePaymentFields(input),
      (error: unknown) => error instanceof ApiError && error.messageKey === messageKey,
    );
  }
});
