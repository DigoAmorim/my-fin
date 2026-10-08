import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../lib/api-errors';
import { parseVariableIncomePositions } from './variable-income-service';

test('parses stock investments with quantity, unit value, and total amount', () => {
  assert.deepEqual(parseVariableIncomePositions({
    results: [
      {
        id: 'stock-1',
        type: 'EQUITY',
        subtype: 'STOCK',
        name: 'PETR4',
        quantity: 12,
        value: 36.45,
        amount: 437.40,
        date: '2026-10-07T12:00:00.000Z',
      },
      {
        id: 'stock-zero',
        type: 'EQUITY',
        subtype: 'STOCK',
        name: 'VALE3',
        quantity: 1,
        value: 60,
        amount: 0,
      },
      {
        id: 'fund-1',
        type: 'EQUITY',
        subtype: 'FUND',
        name: 'Fundo',
        quantity: 1,
        value: 10,
        amount: 10,
      },
      {
        id: 'fixed-1',
        type: 'FIXED_INCOME',
        subtype: 'CDB',
        name: 'CDB',
        quantity: 1,
        value: 10,
        amount: 10,
      },
    ],
  }), [{
    id: 'stock-1',
    assetName: 'PETR4',
    type: 'EQUITY',
    quantity: '12',
    unitValue: '36.45',
    amount: '437.40',
    updatedAt: '2026-10-07T12:00:00.000Z',
  }]);
});

test('accepts Pluggy unit-value casing and rejects malformed non-zero stock positions', () => {
  assert.equal(parseVariableIncomePositions({
    results: [{
      id: 'stock-1',
      type: 'EQUITY',
      subtype: 'STOCK',
      name: 'PETR4',
      quantity: '1.5',
      Value: '30.25',
      amount: '45.375',
    }],
  })[0].amount, '45.38');

  assert.throws(
    () => parseVariableIncomePositions({
      results: [{
        id: 'stock-1',
        type: 'EQUITY',
        subtype: 'STOCK',
        name: 'PETR4',
        quantity: '1.5',
        amount: 45,
      }],
    }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'pluggyResponseInvalid',
  );
});
