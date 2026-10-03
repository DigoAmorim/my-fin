import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../lib/api-errors';
import { createPurchaseLimit } from './purchase-limit-service';

test('rejects purchase types that are not supported', async () => {
  await assert.rejects(
    createPurchaseLimit({ purchaseType: 'other', amount: '100' }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'purchaseLimitTypeInvalid',
  );
});

test('requires a positive decimal limit amount', async () => {
  for (const amount of ['0', '0.00', '-1', 'invalid']) {
    await assert.rejects(
      createPurchaseLimit({ purchaseType: 'first_fortnight', amount }),
      ApiError,
    );
  }

  await assert.rejects(
    createPurchaseLimit({ purchaseType: 'first_fortnight', amount: '0' }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'purchaseLimitAmountPositive',
  );
});

test('limits purchase limit precision and maximum value', async () => {
  await assert.rejects(
    createPurchaseLimit({ purchaseType: 'recurring', amount: '10.001' }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'purchaseLimitAmountMaxDecimals',
  );
  await assert.rejects(
    createPurchaseLimit({ purchaseType: 'recurring', amount: '10000000000' }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'purchaseLimitAmountMaxValue',
  );
});

test('normalizes numeric values expressed in scientific notation before validation', async () => {
  await assert.rejects(
    createPurchaseLimit({ purchaseType: 'recurring', amount: 1e-7 }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'purchaseLimitAmountMaxDecimals',
  );
});

test('does not accept a client-provided limit id', async () => {
  await assert.rejects(
    createPurchaseLimit({ id: 4, purchaseType: 'installment_plan', amount: '100' }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'purchaseLimitIdGenerated',
  );
});
