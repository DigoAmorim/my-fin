import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../lib/api-errors';
import {
  groupFixedIncomePositions,
  parseFixedIncomePositions,
  sumFixedIncomeAmounts,
} from './fixed-income-service';

test('parses fixed income positions and sums decimal amounts safely', () => {
  const positions = parseFixedIncomePositions({
    results: [
      { id: '1', type: 'FIXED_INCOME', subtype: 'CDB', amount: '100.50', date: '2025-01-02T03:04:05.000Z' },
      { id: '2', type: 'FIXED_INCOME', subtype: 'TREASURY', amount: 250 },
      { id: '3', type: 'EQUITY', subtype: 'STOCK', amount: '999.00' },
      { id: '4', type: 'FIXED_INCOME', subtype: 'LCI', amount: '0.25' },
    ],
  }, '2025-02-03T04:05:06.000Z');

  assert.deepEqual(positions, [
    { id: '1', subtype: 'CDB', amount: '100.50', updatedAt: '2025-01-02T03:04:05.000Z' },
    { id: '2', subtype: 'TREASURY', amount: '250.00', updatedAt: '2025-02-03T04:05:06.000Z' },
    { id: '4', subtype: 'LCI', amount: '0.25', updatedAt: '2025-02-03T04:05:06.000Z' },
  ]);
  assert.equal(sumFixedIncomeAmounts(positions), '350.75');
});

test('rejects invalid fixed income positions and rounds to cents', () => {
  assert.throws(
    () => parseFixedIncomePositions({ results: [{ id: '1', type: 'FIXED_INCOME', subtype: '', amount: '10' }] }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'pluggyResponseInvalid',
  );

  const rounded = parseFixedIncomePositions({
    results: [
      { id: '2', type: 'FIXED_INCOME', subtype: 'CDB', amount: '10.004' },
      { id: '3', type: 'FIXED_INCOME', subtype: 'CDB', amount: '10.005' },
      { id: '4', type: 'FIXED_INCOME', subtype: 'CDB', amount: -10.005 },
    ],
  });
  assert.deepEqual(rounded.map(({ amount }) => amount), ['10.00', '10.01', '-10.01']);
});

test('groups fixed income positions by subtype before persistence', () => {
  const groups = groupFixedIncomePositions([
    { id: '1', subtype: 'CDB', amount: '100.10', updatedAt: '2025-01-01T00:00:00.000Z' },
    { id: '2', subtype: 'CDB', amount: '0.20', updatedAt: '2025-01-02T00:00:00.000Z' },
    { id: '3', subtype: 'LCI', amount: '50.00', updatedAt: '2025-01-01T00:00:00.000Z' },
  ]);

  assert.deepEqual(groups, [
    { id: 'CDB', subtype: 'CDB', amount: '100.30', updatedAt: '2025-01-02T00:00:00.000Z' },
    { id: 'LCI', subtype: 'LCI', amount: '50.00', updatedAt: '2025-01-01T00:00:00.000Z' },
  ]);
});

test('subtracts each investment tax before grouping by subtype', () => {
  const positions = parseFixedIncomePositions({
    results: [
      { id: '1', type: 'FIXED_INCOME', subtype: 'CDB', amount: 100.50, taxes: 5.25 },
      { id: '2', type: 'FIXED_INCOME', subtype: 'CDB', amount: '60.00', taxes: '10.00' },
      { id: '3', type: 'FIXED_INCOME', subtype: 'LCI', amount: '50.00' },
    ],
  });

  assert.deepEqual(positions.map(({ amount }) => amount), ['95.25', '50.00', '50.00']);
  assert.deepEqual(
    groupFixedIncomePositions(positions).map(({ subtype, amount }) => ({ subtype, amount })),
    [
      { subtype: 'CDB', amount: '145.25' },
      { subtype: 'LCI', amount: '50.00' },
    ],
  );
});