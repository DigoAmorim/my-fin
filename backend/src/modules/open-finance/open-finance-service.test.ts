import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../lib/api-errors';
import { parseOpenFinanceBankFields } from './open-finance-service';

const validBank = {
  bankName: '  Banco Exemplo  ',
  checkingAccount: true,
  savingsAccount: false,
  fixedIncome: true,
  variableIncome: false,
  pluggyItemId: ' item-123 ',
};

test('normalizes Open Finance bank text and preserves selected data types', () => {
  assert.deepEqual(parseOpenFinanceBankFields(validBank), {
    bankName: 'Banco Exemplo',
    checkingAccount: true,
    savingsAccount: false,
    fixedIncome: true,
    variableIncome: false,
    pluggyItemId: 'item-123',
  });
});

test('requires a name, a Pluggy item ID, boolean options, and at least one selected type', () => {
  const invalidCases: Array<[Record<string, unknown>, string]> = [
    [{ ...validBank, bankName: ' ' }, 'openFinanceBankNameRequired'],
    [{ ...validBank, pluggyItemId: ' ' }, 'openFinancePluggyItemIdRequired'],
    [{ ...validBank, fixedIncome: 'true' }, 'openFinanceOptionsInvalid'],
    [{
      ...validBank,
      checkingAccount: false,
      fixedIncome: false,
    }, 'openFinanceOptionRequired'],
  ];

  for (const [input, messageKey] of invalidCases) {
    assert.throws(
      () => parseOpenFinanceBankFields(input),
      (error: unknown) => error instanceof ApiError && error.messageKey === messageKey,
    );
  }
});

test('rejects bank names and Pluggy item IDs longer than the database limits', () => {
  const invalidCases: Array<[Record<string, unknown>, string]> = [
    [{ ...validBank, bankName: 'B'.repeat(101) }, 'openFinanceBankNameMaxLength'],
    [{ ...validBank, pluggyItemId: 'x'.repeat(101) }, 'openFinancePluggyItemIdMaxLength'],
  ];

  for (const [input, messageKey] of invalidCases) {
    assert.throws(
      () => parseOpenFinanceBankFields(input),
      (error: unknown) => error instanceof ApiError && error.messageKey === messageKey,
    );
  }
});
