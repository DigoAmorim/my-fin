import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../lib/api-errors';
import { parseManualAccountFields, parsePluggyAccounts } from './account-service';

const validAccount = {
  bankName: '  Banco Exemplo  ',
  accountNumber: ' 00123-4 ',
  accountType: 'checking',
  balance: '1520.75',
  updatedAt: '2026-10-06T14:30:00.000Z',
};

test('normalizes manual account details and preserves its timestamp and decimal balance', () => {
  assert.deepEqual(parseManualAccountFields(validAccount), {
    bankName: 'Banco Exemplo',
    accountNumber: '00123-4',
    accountType: 'checking',
    balance: '1520.75',
    updatedAt: '2026-10-06T14:30:00.000Z',
  });
});

test('accepts fixed income as a manual account type', () => {
  assert.equal(parseManualAccountFields({
    ...validAccount,
    accountType: 'fixed_income',
  }).accountType, 'fixed_income');
});

test('validates required account fields, supported types, amount precision, and timestamp', () => {
  const invalidCases: Array<[Record<string, unknown>, string]> = [
    [{ ...validAccount, bankName: ' ' }, 'accountBankNameRequired'],
    [{ ...validAccount, accountNumber: '' }, 'accountNumberRequired'],
    [{ ...validAccount, accountType: 'investment' }, 'accountTypeInvalid'],
    [{ ...validAccount, balance: '12,34' }, 'accountBalanceInvalid'],
    [{ ...validAccount, balance: '12.345' }, 'accountBalanceMaxDecimals'],
    [{ ...validAccount, updatedAt: 'not a date' }, 'accountUpdatedAtInvalid'],
  ];

  for (const [input, messageKey] of invalidCases) {
    assert.throws(
      () => parseManualAccountFields(input),
      (error: unknown) => error instanceof ApiError && error.messageKey === messageKey,
    );
  }
});

test('keeps only enabled bank account types from Pluggy', () => {
  const bank = {
    id: 1,
    bank_name: 'Banco Exemplo',
    checking_account: true,
    savings_account: false,
    fixed_income: true,
    pluggy_item_id: 'item-123',
  };

  assert.deepEqual(parsePluggyAccounts({
    results: [
      {
        id: 'checking-1',
        subtype: 'CHECKING_ACCOUNT',
        number: '00123-4',
        balance: 250.75,
        updatedAt: '2026-10-05T10:30:00.000Z',
      },
      {
        id: 'fixed-income-1',
        subtype: 'FIXED_INCOME',
        number: '00987-6',
        balance: 400,
        updatedAt: '2026-10-05T10:30:00.000Z',
      },
      { id: 'credit-1', subtype: 'CREDIT_CARD', number: '1234', balance: 10 },
    ],
  }, bank), [{
    id: 'checking-1',
    number: '00123-4',
    subtype: 'checking',
    balance: '250.75',
    updatedAt: '2026-10-05T10:30:00.000Z',
  }, {
    id: 'fixed-income-1',
    number: '00987-6',
    subtype: 'fixed_income',
    balance: '400',
    updatedAt: '2026-10-05T10:30:00.000Z',
  }]);
});

test('adds reserved checking-account balances and leaves balances unchanged when none exist', () => {
  const bank = {
    id: 1,
    bank_name: 'Banco Exemplo',
    checking_account: true,
    savings_account: false,
    fixed_income: false,
    pluggy_item_id: 'item-123',
  };
  const account = {
    id: 'checking-1',
    subtype: 'CHECKING_ACCOUNT',
    number: '00123-4',
    balance: 173726.51,
    updatedAt: '2026-10-05T10:30:00.000Z',
  };

  assert.equal(parsePluggyAccounts({
    results: [{
      ...account,
      bankData: {
        hasReservedBalance: true,
        reservedBalances: [
          { availableAmounts: [{ amount: 0, currencyCode: 'BRL' }] },
          { availableAmounts: [{ amount: 5883.81, currencyCode: 'BRL' }] },
        ],
      },
    }],
  }, bank)[0].balance, '179610.32');
  assert.equal(parsePluggyAccounts({ results: [account] }, bank)[0].balance, '173726.51');
});

test('rejects incomplete account data for an enabled Pluggy account type', () => {
  assert.throws(
    () => parsePluggyAccounts({
      results: [{
        id: 'checking-1',
        subtype: 'CHECKING_ACCOUNT',
        number: '',
        balance: 20,
        updatedAt: '2026-10-05T10:30:00.000Z',
      }],
    }, {
      id: 1,
      bank_name: 'Banco Exemplo',
      checking_account: true,
      savings_account: false,
      fixed_income: false,
      pluggy_item_id: 'item-123',
    }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'pluggyResponseInvalid',
  );
});

test('rejects missing or invalid Pluggy account update timestamps', () => {
  const bank = {
    id: 1,
    bank_name: 'Banco Exemplo',
    checking_account: true,
    savings_account: false,
    fixed_income: false,
    pluggy_item_id: 'item-123',
  };
  const account = {
    id: 'checking-1',
    subtype: 'CHECKING_ACCOUNT',
    number: '00123-4',
    balance: 20,
  };

  for (const value of [account, { ...account, updatedAt: 'not a date' }]) {
    assert.throws(
      () => parsePluggyAccounts({ results: [value] }, bank),
      (error: unknown) => error instanceof ApiError && error.messageKey === 'pluggyResponseInvalid',
    );
  }
});
