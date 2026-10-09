import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../lib/api-errors';
import { parseCreateYieldFields, parseUpdateYieldFields } from './yield-service';

test('parses a yield record account and automatic mode', () => {
  assert.deepEqual(parseCreateYieldFields({ accountId: 4, isAutomatic: true }), {
    accountId: 4,
    isAutomatic: true,
  });
});

test('normalizes a manual yield amount including negative values', () => {
  assert.deepEqual(parseUpdateYieldFields({ isAutomatic: false, amount: '-12.5' }), {
    isAutomatic: false,
    amount: '-12.50',
  });
});

test('automatic yield updates do not require a manual amount', () => {
  assert.deepEqual(parseUpdateYieldFields({ isAutomatic: true }), {
    isAutomatic: true,
    amount: '0.00',
  });
});

test('validates yield account, mode, and manual amount', () => {
  const invalidCases: Array<[Record<string, unknown>, string]> = [
    [{ accountId: 0, isAutomatic: false }, 'idPositiveInteger'],
    [{ accountId: 1, isAutomatic: 'true' }, 'yieldAutomaticInvalid'],
  ];
  for (const [input, messageKey] of invalidCases) {
    assert.throws(
      () => parseCreateYieldFields(input),
      (error: unknown) => error instanceof ApiError && error.messageKey === messageKey,
    );
  }

  const invalidAmounts: Array<[unknown, string]> = [
    [undefined, 'yieldAmountInvalid'],
    ['1.001', 'yieldAmountMaxDecimals'],
    ['1,25', 'yieldAmountInvalid'],
    ['1000000000000', 'yieldAmountMaxValue'],
  ];
  for (const [amount, messageKey] of invalidAmounts) {
    assert.throws(
      () => parseUpdateYieldFields({ isAutomatic: false, amount }),
      (error: unknown) => error instanceof ApiError && error.messageKey === messageKey,
    );
  }
});
