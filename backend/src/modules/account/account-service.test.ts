import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../lib/api-errors';
import {
  bancoDoBrasilAccountType,
  calculateBancoDoBrasilBalances,
  calculateBmgInvestmentBalance,
  calculateInvestmentBalance,
  calculateMercadoPagoBalance,
  calculateNubankBalances,
  nubankAccountType,
  parseAccountFields,
  createAccount,
} from './account-service';

const validAccount = {
  name: 'Conta principal',
  bankName: 'Banco do Brasil',
  pluggyItemId: '',
  currentBalance: '1250.5',
};

test('recognizes the Banco do Brasil account names currently used in the account list', () => {
  assert.equal(bancoDoBrasilAccountType('Conta Corrente'), 'checking');
  assert.equal(bancoDoBrasilAccountType('Conta Poupança'), 'savings');
  assert.equal(bancoDoBrasilAccountType('Conta Corrente do Banco do Brasil'), 'checking');
  assert.equal(bancoDoBrasilAccountType('Conta Poupança do Banco do Brasil'), 'savings');
  assert.equal(bancoDoBrasilAccountType('Conta Investimento'), null);
});

test('recognizes Nubank checking and caixinha account names', () => {
  assert.equal(nubankAccountType('Nubank Corrente'), 'checking');
  assert.equal(nubankAccountType('Conta Corrente'), 'checking');
  assert.equal(nubankAccountType('Conta Corrente do Nubank'), 'checking');
  assert.equal(nubankAccountType('NuCaixinha'), 'caixinha');
  assert.equal(nubankAccountType('Nu Caixinha'), 'caixinha');
  assert.equal(nubankAccountType('CDB'), 'caixinha');
  assert.equal(nubankAccountType('Cartão de Crédito'), null);
});

test('normalizes account text, optional Pluggy id and balance', () => {
  assert.deepEqual(parseAccountFields(validAccount), {
    name: 'Conta principal',
    bankName: 'Banco do Brasil',
    pluggyItemId: null,
    currentBalance: '1250.50',
  });
});

test('accepts negative balances and normalizes negative zero', () => {
  assert.equal(parseAccountFields({ ...validAccount, currentBalance: '-35.7' }).currentBalance, '-35.70');
  assert.equal(parseAccountFields({ ...validAccount, currentBalance: '-0.00' }).currentBalance, '0.00');
});

test('requires account and bank names and validates Pluggy item id', () => {
  const invalidCases: Array<[Record<string, unknown>, string]> = [
    [{ ...validAccount, name: ' ' }, 'accountNameRequired'],
    [{ ...validAccount, bankName: '' }, 'accountBankNameRequired'],
    [{ ...validAccount, pluggyItemId: 123 }, 'accountPluggyItemIdInvalid'],
    [{ ...validAccount, pluggyItemId: 'x'.repeat(101) }, 'accountPluggyItemIdMaxLength'],
  ];

  for (const [input, messageKey] of invalidCases) {
    assert.throws(
      () => parseAccountFields(input),
      (error: unknown) => error instanceof ApiError && error.messageKey === messageKey,
    );
  }
});

test('rejects malformed, over-precise and out-of-range balances', () => {
  const invalidCases: Array<[unknown, string]> = [
    ['1,25', 'accountBalanceInvalid'],
    ['1.234', 'accountBalanceMaxDecimals'],
    ['10000000000', 'accountBalanceMaxValue'],
  ];

  for (const [currentBalance, messageKey] of invalidCases) {
    assert.throws(
      () => parseAccountFields({ ...validAccount, currentBalance }),
      (error: unknown) => error instanceof ApiError && error.messageKey === messageKey,
    );
  }
});

test('does not accept a client-provided account id', async () => {
  await assert.rejects(
    createAccount({ ...validAccount, id: 7 }),
    (error: unknown) => error instanceof ApiError && error.messageKey === 'accountIdGenerated',
  );
});

test('calculates BMG investment net balance and selects the latest Pluggy update timestamp', () => {
  assert.deepEqual(calculateBmgInvestmentBalance({
    results: [
      { amount: 1000, taxes: 10.25, updatedAt: '2026-10-03T10:00:00.000Z' },
      { balance: '250.50', taxesAmount: '2.00', updateat: '2026-10-03T12:30:00.000Z' },
    ],
  }), {
    balance: '1238.25',
    updatedAt: '2026-10-03T12:30:00.000Z',
  });
});

test('rejects BMG investment responses without a valid update timestamp', () => {
  assert.throws(
    () => calculateBmgInvestmentBalance({ results: [{ amount: 100, updatedAt: 'invalid' }] }),
    /did not include a valid update timestamp/,
  );
  assert.throws(
    () => calculateBmgInvestmentBalance({ results: [] }),
    /no investments/,
  );
});

test('applies the same net investment calculation to Sofisa Direto', () => {
  assert.deepEqual(calculateInvestmentBalance({
    results: [
      { amount: '500.00', taxes: '12.50', updatedAt: '2026-10-03T10:00:00.000Z' },
      { balance: '250.75', taxesAmount: '1.25', updatedAt: '2026-10-03T12:30:00.000Z' },
    ],
  }, 'Sofisa Direto'), {
    balance: '737.00',
    updatedAt: '2026-10-03T12:30:00.000Z',
  });
});

test('rounds Sofisa investment amounts and taxes to cents before updating its balance', () => {
  assert.deepEqual(calculateInvestmentBalance({
    results: [
      { amount: '100.126', taxes: '0.014', updatedAt: '2026-10-03T10:00:00.000Z' },
      { balance: '20.995', taxesAmount: '0.005', updatedAt: '2026-10-03T12:30:00.000Z' },
    ],
  }, 'Sofisa Direto', true), {
    balance: '121.11',
    updatedAt: '2026-10-03T12:30:00.000Z',
  });
});

test('continues to reject investment values with more than two decimals unless rounding is enabled', () => {
  assert.throws(
    () => calculateBmgInvestmentBalance({
      results: [{ amount: '100.126', updatedAt: '2026-10-03T10:00:00.000Z' }],
    }),
    /more than two decimal places/,
  );
});

test('sums all Banco do Brasil savings accounts and keeps the latest timestamp per subtype', () => {
  assert.deepEqual(calculateBancoDoBrasilBalances({
    results: [
      { subtype: 'CHECKING_ACCOUNT', balance: '1250.45', updatedAt: '2026-10-03T09:00:00.000Z' },
      { subtype: 'SAVINGS_ACCOUNT', balance: '300.10', updatedAt: '2026-10-03T10:00:00.000Z' },
      { subtype: 'SAVINGS_ACCOUNT', balance: '450.25', updatedAt: '2026-10-03T11:30:00.000Z' },
      { subtype: 'CREDIT_CARD', balance: '9999.00', updatedAt: '2026-10-03T12:00:00.000Z' },
    ],
  }), {
    checking: {
      balance: '1250.45',
      updatedAt: '2026-10-03T09:00:00.000Z',
    },
    savings: {
      balance: '750.35',
      updatedAt: '2026-10-03T11:30:00.000Z',
    },
  });
});

test('does not produce a balance when Banco do Brasil response has no supported account subtype', () => {
  assert.deepEqual(calculateBancoDoBrasilBalances({
    results: [{ subtype: 'CREDIT_CARD', balance: '9999.00', updatedAt: '2026-10-03T12:00:00.000Z' }],
  }), {});
});

test('rejects Banco do Brasil balances with a missing update timestamp', () => {
  assert.throws(
    () => calculateBancoDoBrasilBalances({
      results: [{ subtype: 'SAVINGS_ACCOUNT', balance: '100.00', updatedAt: 'invalid' }],
    }),
    /did not include a valid update timestamp/,
  );
});

test('adds Mercado Pago reserved available amounts to the first account balance', () => {
  assert.deepEqual(calculateMercadoPagoBalance({
    results: [
      {
        balance: '100.25',
        updatedAt: '2026-10-03T09:00:00.000Z',
        bankData: {
          reservedBalances: [
            { availableAmounts: [{ amount: 20.10 }, { amount: '5.65' }] },
            { availableAmounts: [{ amount: 30 }] },
            {},
          ],
        },
      },
      { balance: '99999.00', updatedAt: '2026-10-03T12:00:00.000Z' },
    ],
  }), {
    balance: '156.00',
    updatedAt: '2026-10-03T09:00:00.000Z',
  });
});

test('returns no Mercado Pago balance when Pluggy has no accounts', () => {
  assert.equal(calculateMercadoPagoBalance({ results: [] }), null);
});

test('rejects Mercado Pago records without a balance or valid update timestamp', () => {
  assert.throws(
    () => calculateMercadoPagoBalance({
      results: [{ updatedAt: '2026-10-03T09:00:00.000Z' }],
    }),
    /Mercado Pago account did not include a valid balance/,
  );
  assert.throws(
    () => calculateMercadoPagoBalance({
      results: [{ balance: '100.00', updatedAt: 'invalid' }],
    }),
    /Mercado Pago account did not include a valid update timestamp/,
  );
});

test('calculates Nubank checking balance and sums net CDB investments only', () => {
  assert.deepEqual(calculateNubankBalances({
    results: [
      { subtype: 'CHECKING_ACCOUNT', balance: '1250.45', updatedAt: '2026-10-03T09:00:00.000Z' },
      { subtype: 'SAVINGS_ACCOUNT', balance: '9999.00', updatedAt: '2026-10-03T10:00:00.000Z' },
    ],
  }, {
    results: [
      { subtype: 'CDB', amount: '300.00', taxes: '5.25', updatedAt: '2026-10-03T10:00:00.000Z' },
      { subtype: 'CDB', balance: '450.50', taxesAmount: '2.00', updateat: '2026-10-03T11:30:00.000Z' },
      { subtype: 'OTHER', amount: '1000.00', updatedAt: '2026-10-03T12:00:00.000Z' },
    ],
  }), {
    checking: {
      balance: '1250.45',
      updatedAt: '2026-10-03T09:00:00.000Z',
    },
    caixinha: {
      balance: '743.25',
      updatedAt: '2026-10-03T11:30:00.000Z',
    },
  });
});

test('does not produce Nubank balances for missing account subtypes or CDB investments', () => {
  assert.deepEqual(calculateNubankBalances({
    results: [{ subtype: 'SAVINGS_ACCOUNT', balance: '999.00', updatedAt: '2026-10-03T09:00:00.000Z' }],
  }, {
    results: [{ subtype: 'OTHER', amount: '100.00', updatedAt: '2026-10-03T10:00:00.000Z' }],
  }), {});
});

test('rejects Nubank checking and CDB balances without valid update timestamps', () => {
  assert.throws(
    () => calculateNubankBalances({
      results: [{ subtype: 'CHECKING_ACCOUNT', balance: '100.00', updatedAt: 'invalid' }],
    }, { results: [] }),
    /Nubank checking account did not include a valid update timestamp/,
  );
  assert.throws(
    () => calculateNubankBalances({ results: [] }, {
      results: [{ subtype: 'CDB', amount: '100.00', updatedAt: 'invalid' }],
    }),
    /Nubank CDB investments did not include a valid update timestamp/,
  );
});
