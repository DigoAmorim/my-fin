import { ApiError } from '../../lib/api-errors';
import { numberToDecimalString } from '../../lib/decimal';
import {
  getPluggyAccounts,
  getPluggyInvestments,
  getPluggyToken,
  PluggyCredentialsMissingError,
} from '../../lib/pluggy-client';
import { asRecord, parsePositiveId } from '../../lib/request-validation';
import * as repository from './account-repository';
import type { Account, AccountFields } from './account-types';

const MAX_ACCOUNT_BALANCE_CENTS = 999_999_999_999n;

type PluggyInvestment = {
  amount?: unknown;
  balance?: unknown;
  taxes?: unknown;
  taxesAmount?: unknown;
  updatedAt?: unknown;
  updateAt?: unknown;
  updateat?: unknown;
};

type PluggyBankAccount = {
  subtype?: unknown;
  balance?: unknown;
  updatedAt?: unknown;
};

type MercadoPagoBalance = {
  balance: string;
  updatedAt: string;
};

type BancoDoBrasilAccountType = 'checking' | 'savings';
type NubankAccountType = 'checking' | 'caixinha';
type BancoDoBrasilBalance = {
  balance: string;
  updatedAt: string;
};
type BancoDoBrasilBalances = Partial<Record<BancoDoBrasilAccountType, BancoDoBrasilBalance>>;
type NubankBalance = {
  balance: string;
  updatedAt: string;
};
type NubankBalances = Partial<Record<NubankAccountType, NubankBalance>>;

export type RefreshAccountsResult = {
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  failedAccounts: string[];
  updatedAccounts: Account[];
};

function valueInCents(value: unknown, roundExcessDecimals = false): bigint {
  if (value === undefined || value === null || value === '') return 0n;

  const decimal = typeof value === 'number' && Number.isFinite(value)
    ? numberToDecimalString(value)
    : typeof value === 'string'
      ? value.trim()
      : '';
  if (!/^-?\d+(?:\.\d+)?$/.test(decimal)) {
    throw new Error('Pluggy investment contains an invalid monetary value.');
  }

  const negative = decimal.startsWith('-');
  const unsigned = negative ? decimal.slice(1) : decimal;
  const [whole, fraction = ''] = unsigned.split('.');
  if (fraction.length > 2 && !roundExcessDecimals) {
    throw new Error('Pluggy investment contains more than two decimal places.');
  }

  let fractionalCents = BigInt(fraction.slice(0, 2).padEnd(2, '0'));
  if (roundExcessDecimals && fraction.length > 2 && fraction[2] >= '5') {
    fractionalCents += 1n;
  }
  const cents = BigInt(whole) * 100n + fractionalCents;
  return negative ? -cents : cents;
}

function preferredValue(primary: unknown, fallback: unknown): unknown {
  return primary || fallback || 0;
}

function isBmgBank(bankName: string): boolean {
  const normalized = normalizeName(bankName);
  return ` ${normalized} `.includes(' bmg ');
}

function isSofisaDiretoBank(bankName: string): boolean {
  return normalizeName(bankName).includes('sofisa');
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isBancoDoBrasil(bankName: string): boolean {
  return ` ${normalizeName(bankName)} `.includes(' banco do brasil ');
}

function isNubank(bankName: string): boolean {
  return normalizeName(bankName).includes('nubank');
}

function isMercadoPago(bankName: string): boolean {
  return normalizeName(bankName).includes('mercado pago');
}

export function bancoDoBrasilAccountType(accountName: string): BancoDoBrasilAccountType | null {
  const normalized = normalizeName(accountName);
  if (normalized === 'conta corrente' || normalized === 'conta corrente do banco do brasil') {
    return 'checking';
  }
  if (normalized === 'conta poupanca' || normalized === 'conta poupanca do banco do brasil') {
    return 'savings';
  }
  return null;
}

export function nubankAccountType(accountName: string): NubankAccountType | null {
  const normalized = normalizeName(accountName);
  if (['nubank corrente', 'conta corrente', 'conta corrente do nubank'].includes(normalized)) {
    return 'checking';
  }
  if (['nucaixinha', 'nu caixinha', 'cdb', 'cdb nubank'].includes(normalized)) {
    return 'caixinha';
  }
  return null;
}

/** Sums net investment values and returns the most recent timestamp. */
export function calculateInvestmentBalance(
  input: unknown,
  institutionName: string,
  roundExcessDecimals = false,
): { balance: string; updatedAt: string } {
  if (typeof input !== 'object' || input === null || !('results' in input) || !Array.isArray(input.results)) {
    throw new Error('Pluggy investments response does not contain a results array.');
  }
  if (input.results.length === 0) {
    throw new Error(`Pluggy returned no investments to calculate the ${institutionName} balance.`);
  }

  let totalCents = 0n;
  let latestUpdatedAt: Date | null = null;

  for (const rawInvestment of input.results) {
    if (typeof rawInvestment !== 'object' || rawInvestment === null) {
      throw new Error('Pluggy returned an invalid investment record.');
    }
    const investment = rawInvestment as PluggyInvestment;
    const amount = valueInCents(
      preferredValue(investment.amount, investment.balance),
      roundExcessDecimals,
    );
    const taxes = valueInCents(
      preferredValue(investment.taxes, investment.taxesAmount),
      roundExcessDecimals,
    );
    totalCents += amount - taxes;

    const timestamp = investment.updatedAt ?? investment.updateAt ?? investment.updateat;
    if (typeof timestamp === 'string') {
      const parsedTimestamp = new Date(timestamp);
      if (!Number.isNaN(parsedTimestamp.getTime())
        && (!latestUpdatedAt || parsedTimestamp > latestUpdatedAt)) {
        latestUpdatedAt = parsedTimestamp;
      }
    }
  }

  if (!latestUpdatedAt) {
    throw new Error('Pluggy investments did not include a valid update timestamp.');
  }
  if (totalCents > MAX_ACCOUNT_BALANCE_CENTS || totalCents < -MAX_ACCOUNT_BALANCE_CENTS) {
    throw new Error(`Calculated ${institutionName} balance exceeds the supported account balance range.`);
  }

  return {
    balance: formatCents(totalCents),
    updatedAt: latestUpdatedAt.toISOString(),
  };
}

export function calculateBmgInvestmentBalance(input: unknown): { balance: string; updatedAt: string } {
  return calculateInvestmentBalance(input, 'BMG');
}

/** Sums each Banco do Brasil subtype separately and keeps its newest update timestamp. */
export function calculateBancoDoBrasilBalances(input: unknown): BancoDoBrasilBalances {
  if (typeof input !== 'object' || input === null || !('results' in input) || !Array.isArray(input.results)) {
    throw new Error('Pluggy accounts response does not contain a results array.');
  }

  const totals: Record<BancoDoBrasilAccountType, bigint> = { checking: 0n, savings: 0n };
  const latestUpdates: Partial<Record<BancoDoBrasilAccountType, Date>> = {};
  const foundTypes = new Set<BancoDoBrasilAccountType>();

  for (const rawAccount of input.results) {
    if (typeof rawAccount !== 'object' || rawAccount === null) {
      throw new Error('Pluggy returned an invalid bank account record.');
    }

    const account = rawAccount as PluggyBankAccount;
    const type = account.subtype === 'CHECKING_ACCOUNT'
      ? 'checking'
      : account.subtype === 'SAVINGS_ACCOUNT'
        ? 'savings'
        : null;
    if (!type) continue;

    foundTypes.add(type);
    totals[type] += valueInCents(account.balance);

    if (typeof account.updatedAt === 'string') {
      const timestamp = new Date(account.updatedAt);
      if (!Number.isNaN(timestamp.getTime())
        && (!latestUpdates[type] || timestamp > latestUpdates[type])) {
        latestUpdates[type] = timestamp;
      }
    }
  }

  const balances: BancoDoBrasilBalances = {};
  for (const type of foundTypes) {
    const updatedAt = latestUpdates[type];
    if (!updatedAt) {
      throw new Error(`Pluggy ${type} accounts did not include a valid update timestamp.`);
    }
    if (totals[type] > MAX_ACCOUNT_BALANCE_CENTS || totals[type] < -MAX_ACCOUNT_BALANCE_CENTS) {
      throw new Error(`Calculated Banco do Brasil ${type} balance exceeds the supported range.`);
    }
    balances[type] = {
      balance: formatCents(totals[type]),
      updatedAt: updatedAt.toISOString(),
    };
  }

  return balances;
}

/** Adds the Mercado Pago account balance to all available amounts in its reserved balances. */
export function calculateMercadoPagoBalance(input: unknown): MercadoPagoBalance | null {
  if (typeof input !== 'object' || input === null || !('results' in input) || !Array.isArray(input.results)) {
    throw new Error('Pluggy accounts response does not contain a results array.');
  }
  if (input.results.length === 0) return null;

  const rawAccount = input.results[0];
  if (typeof rawAccount !== 'object' || rawAccount === null) {
    throw new Error('Pluggy returned an invalid Mercado Pago account record.');
  }

  const account = rawAccount as PluggyBankAccount & { bankData?: unknown };
  if (account.balance === undefined || account.balance === null || account.balance === '') {
    throw new Error('Pluggy Mercado Pago account did not include a valid balance.');
  }
  const updatedAt = parsePluggyTimestamp(account.updatedAt);
  if (!updatedAt) {
    throw new Error('Pluggy Mercado Pago account did not include a valid update timestamp.');
  }

  let totalCents = valueInCents(account.balance);
  if (typeof account.bankData === 'object' && account.bankData !== null && 'reservedBalances' in account.bankData) {
    const reservedBalances = account.bankData.reservedBalances;
    if (reservedBalances !== undefined && reservedBalances !== null && !Array.isArray(reservedBalances)) {
      throw new Error('Pluggy Mercado Pago reserved balances are invalid.');
    }

    for (const rawReservedBalance of reservedBalances ?? []) {
      if (typeof rawReservedBalance !== 'object' || rawReservedBalance === null) {
        throw new Error('Pluggy returned an invalid Mercado Pago reserved balance.');
      }
      if (!('availableAmounts' in rawReservedBalance)) continue;
      const availableAmounts = rawReservedBalance.availableAmounts;
      if (availableAmounts === undefined || availableAmounts === null) continue;
      if (!Array.isArray(availableAmounts)) {
        throw new Error('Pluggy Mercado Pago available amounts are invalid.');
      }
      for (const rawAvailableAmount of availableAmounts) {
        if (typeof rawAvailableAmount !== 'object' || rawAvailableAmount === null) {
          throw new Error('Pluggy returned an invalid Mercado Pago available amount.');
        }
        if (!('amount' in rawAvailableAmount)) continue;
        totalCents += valueInCents(rawAvailableAmount.amount);
      }
    }
  }

  if (totalCents > MAX_ACCOUNT_BALANCE_CENTS || totalCents < -MAX_ACCOUNT_BALANCE_CENTS) {
    throw new Error('Calculated Mercado Pago balance exceeds the supported account balance range.');
  }

  return {
    balance: formatCents(totalCents),
    updatedAt: updatedAt.toISOString(),
  };
}

/** Gets the Nubank checking balance and sums net CDB investments for the caixinha. */
export function calculateNubankBalances(accountsInput: unknown, investmentsInput: unknown): NubankBalances {
  const checking = calculateNubankCheckingBalance(accountsInput);
  const caixinha = calculateNubankCaixinhaBalance(investmentsInput);
  return {
    ...(checking ? { checking } : {}),
    ...(caixinha ? { caixinha } : {}),
  };
}

function calculateNubankCheckingBalance(input: unknown): NubankBalance | null {
  if (
    typeof input !== 'object'
    || input === null
    || !('results' in input)
    || !Array.isArray(input.results)
  ) {
    throw new Error('Pluggy accounts response does not contain a results array.');
  }

  const checkingAccount = input.results.find((rawAccount) => (
    typeof rawAccount === 'object'
    && rawAccount !== null
    && 'subtype' in rawAccount
    && rawAccount.subtype === 'CHECKING_ACCOUNT'
  ));
  if (!checkingAccount) return null;

  const account = checkingAccount as PluggyBankAccount;
  const updatedAt = parsePluggyTimestamp(account.updatedAt);
  if (!updatedAt) {
    throw new Error('Pluggy Nubank checking account did not include a valid update timestamp.');
  }
  const totalCents = valueInCents(account.balance);
  if (totalCents > MAX_ACCOUNT_BALANCE_CENTS || totalCents < -MAX_ACCOUNT_BALANCE_CENTS) {
    throw new Error('Calculated Nubank checking balance exceeds the supported account balance range.');
  }
  return {
    balance: formatCents(totalCents),
    updatedAt: updatedAt.toISOString(),
  };
}

function calculateNubankCaixinhaBalance(input: unknown): NubankBalance | null {
  if (
    typeof input !== 'object'
    || input === null
    || !('results' in input)
    || !Array.isArray(input.results)
  ) {
    throw new Error('Pluggy investments response does not contain a results array.');
  }

  let cdbTotalCents = 0n;
  let cdbCount = 0;
  let latestCdbUpdate: Date | null = null;

  for (const rawInvestment of input.results) {
    if (typeof rawInvestment !== 'object' || rawInvestment === null) {
      throw new Error('Pluggy returned an invalid investment record.');
    }
    const investment = rawInvestment as PluggyInvestment & { subtype?: unknown };
    if (investment.subtype !== 'CDB') continue;

    cdbCount += 1;
    const amount = valueInCents(preferredValue(investment.amount, investment.balance));
    const taxes = valueInCents(preferredValue(investment.taxes, investment.taxesAmount));
    cdbTotalCents += amount - taxes;

    const timestamp = parsePluggyTimestamp(
      investment.updatedAt ?? investment.updateAt ?? investment.updateat,
    );
    if (timestamp && (!latestCdbUpdate || timestamp > latestCdbUpdate)) {
      latestCdbUpdate = timestamp;
    }
  }

  if (cdbCount === 0) return null;
  if (!latestCdbUpdate) {
    throw new Error('Pluggy Nubank CDB investments did not include a valid update timestamp.');
  }
  if (cdbTotalCents > MAX_ACCOUNT_BALANCE_CENTS || cdbTotalCents < -MAX_ACCOUNT_BALANCE_CENTS) {
    throw new Error('Calculated Nubank caixinha balance exceeds the supported account balance range.');
  }
  return {
    balance: formatCents(cdbTotalCents),
    updatedAt: latestCdbUpdate.toISOString(),
  };
}

function parsePluggyTimestamp(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp;
}

function formatCents(totalCents: bigint): string {
  const sign = totalCents < 0n ? '-' : '';
  const absoluteCents = totalCents < 0n ? -totalCents : totalCents;
  return `${sign}${absoluteCents / 100n}.${String(absoluteCents % 100n).padStart(2, '0')}`;
}

function parseBalance(input: unknown): string {
  let value: string;
  if (typeof input === 'number' && Number.isFinite(input)) {
    value = numberToDecimalString(input);
  } else if (typeof input === 'string') {
    value = input.trim();
  } else {
    throw new ApiError(400, 'accountBalanceInvalid');
  }

  if (!/^-?\d+(?:\.\d+)?$/.test(value)) {
    throw new ApiError(400, 'accountBalanceInvalid');
  }

  const isNegative = value.startsWith('-');
  const unsignedValue = isNegative ? value.slice(1) : value;
  const [wholePart, decimalPart = ''] = unsignedValue.split('.');
  if (decimalPart.length > 2) {
    throw new ApiError(400, 'accountBalanceMaxDecimals');
  }

  const whole = wholePart.replace(/^0+(?=\d)/, '');
  if (whole.length > 10) {
    throw new ApiError(400, 'accountBalanceMaxValue');
  }

  const cents = decimalPart.padEnd(2, '0');
  const isZero = BigInt(whole) === 0n && BigInt(cents) === 0n;
  return `${isNegative && !isZero ? '-' : ''}${whole}.${cents}`;
}

export function parseAccountFields(input: unknown): AccountFields {
  const body = asRecord(input);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const bankName = typeof body.bankName === 'string' ? body.bankName.trim() : '';
  const pluggyItemId = typeof body.pluggyItemId === 'string'
    ? body.pluggyItemId.trim() || null
    : body.pluggyItemId === undefined || body.pluggyItemId === null
      ? null
      : undefined;

  if (!name) throw new ApiError(400, 'accountNameRequired');
  if (Array.from(name).length > 100) throw new ApiError(400, 'accountNameMaxLength');
  if (!bankName) throw new ApiError(400, 'accountBankNameRequired');
  if (Array.from(bankName).length > 100) throw new ApiError(400, 'accountBankNameMaxLength');
  if (pluggyItemId === undefined) throw new ApiError(400, 'accountPluggyItemIdInvalid');
  if (pluggyItemId && pluggyItemId.length > 100) {
    throw new ApiError(400, 'accountPluggyItemIdMaxLength');
  }

  return {
    name,
    bankName,
    pluggyItemId,
    currentBalance: parseBalance(body.currentBalance),
  };
}

export async function listAccounts(): Promise<Account[]> {
  return repository.findAll();
}

export async function createAccount(input: unknown): Promise<Account> {
  const body = asRecord(input);
  if (body.id !== undefined) throw new ApiError(400, 'accountIdGenerated');
  return repository.create(parseAccountFields(body));
}

export async function updateAccount(idInput: unknown, input: unknown): Promise<Account> {
  const id = parsePositiveId(idInput);
  const body = asRecord(input);
  if (body.id !== undefined && body.id !== id) {
    throw new ApiError(400, 'accountIdImmutable');
  }

  const account = await repository.update(id, parseAccountFields(body));
  if (!account) throw new ApiError(404, 'accountNotFound');
  return account;
}

export async function deleteAccount(idInput: unknown): Promise<void> {
  const id = parsePositiveId(idInput);
  if (!await repository.remove(id)) throw new ApiError(404, 'accountNotFound');
}

export async function refreshAccounts(): Promise<RefreshAccountsResult> {
  const accounts = await repository.findAll();
  const bmgAccounts = accounts.filter(
    (account): account is Account & { pluggyItemId: string } => (
      Boolean(account.pluggyItemId) && isBmgBank(account.bankName)
    ),
  );
  const sofisaDiretoAccounts = accounts.filter(
    (account): account is Account & { pluggyItemId: string } => (
      Boolean(account.pluggyItemId) && isSofisaDiretoBank(account.bankName)
    ),
  );
  const bancoDoBrasilAccounts = accounts.flatMap((account) => {
    const type = bancoDoBrasilAccountType(account.name);
    return account.pluggyItemId && isBancoDoBrasil(account.bankName) && type
      ? [{ account: account as Account & { pluggyItemId: string }, type }]
      : [];
  });
  const nubankAccounts = accounts.flatMap((account) => {
    const type = nubankAccountType(account.name);
    return account.pluggyItemId && isNubank(account.bankName) && type
      ? [{ account: account as Account & { pluggyItemId: string }, type }]
      : [];
  });
  const mercadoPagoAccounts = accounts.filter(
    (account): account is Account & { pluggyItemId: string } => (
      Boolean(account.pluggyItemId)
      && isMercadoPago(account.bankName)
    ),
  );
  const supportedAccountsCount = (
    bmgAccounts.length
    + sofisaDiretoAccounts.length
    + bancoDoBrasilAccounts.length
    + nubankAccounts.length
    + mercadoPagoAccounts.length
  );
  let skippedCount = accounts.length - supportedAccountsCount;

  if (supportedAccountsCount === 0) {
    return {
      updatedCount: 0,
      skippedCount,
      failedCount: 0,
      failedAccounts: [],
      updatedAccounts: [],
    };
  }

  let apiKey: string;
  try {
    apiKey = await getPluggyToken();
  } catch (error) {
    if (error instanceof PluggyCredentialsMissingError) {
      throw new ApiError(503, 'pluggyCredentialsMissing');
    }
    console.error('Pluggy authentication failed while refreshing accounts:', error);
    throw new ApiError(502, 'pluggyAuthenticationFailed');
  }

  const updatedAccounts: Account[] = [];
  const failedAccounts: string[] = [];

  for (const account of bmgAccounts) {
    try {
      const investments = await getPluggyInvestments(account.pluggyItemId, apiKey);
      const { balance, updatedAt } = calculateInvestmentBalance(investments, 'BMG');
      const updatedAccount = await repository.updateBalance(account.id, balance, updatedAt);
      if (!updatedAccount) {
        throw new Error('Account was removed before its refreshed balance could be saved.');
      }
      updatedAccounts.push(updatedAccount);
    } catch (error) {
      failedAccounts.push(account.name);
      console.error(`Could not refresh BMG account ${account.id}:`, error);
    }
  }

  for (const account of sofisaDiretoAccounts) {
    try {
      const investments = await getPluggyInvestments(account.pluggyItemId, apiKey);
      const { balance, updatedAt } = calculateInvestmentBalance(investments, 'Sofisa Direto', true);
      const updatedAccount = await repository.updateBalance(account.id, balance, updatedAt);
      if (!updatedAccount) {
        throw new Error('Account was removed before its refreshed balance could be saved.');
      }
      updatedAccounts.push(updatedAccount);
    } catch (error) {
      failedAccounts.push(account.name);
      console.error(`Could not refresh Sofisa Direto account ${account.id}:`, error);
    }
  }

  const bbAccountsByItemId = new Map<string, typeof bancoDoBrasilAccounts>();
  for (const target of bancoDoBrasilAccounts) {
    const targets = bbAccountsByItemId.get(target.account.pluggyItemId) ?? [];
    targets.push(target);
    bbAccountsByItemId.set(target.account.pluggyItemId, targets);
  }

  for (const [itemId, targets] of bbAccountsByItemId) {
    try {
      const pluggyAccounts = await getPluggyAccounts(itemId, apiKey);
      const balances = calculateBancoDoBrasilBalances(pluggyAccounts);
      for (const { account, type } of targets) {
        const balance = balances[type];
        // Do not replace a previously known balance when Pluggy has no account of this subtype.
        if (!balance) {
          skippedCount += 1;
          continue;
        }

        try {
          const updatedAccount = await repository.updateBalance(
            account.id,
            balance.balance,
            balance.updatedAt,
          );
          if (!updatedAccount) throw new Error('Account was removed before its balance could be saved.');
          updatedAccounts.push(updatedAccount);
        } catch (error) {
          failedAccounts.push(account.name);
          console.error(`Could not save Banco do Brasil account ${account.id}:`, error);
        }
      }
    } catch (error) {
      failedAccounts.push(...targets.map(({ account }) => account.name));
      console.error(`Could not refresh Banco do Brasil item ${itemId}:`, error);
    }
  }

  const nubankAccountsByItemId = new Map<string, typeof nubankAccounts>();
  for (const target of nubankAccounts) {
    const targets = nubankAccountsByItemId.get(target.account.pluggyItemId) ?? [];
    targets.push(target);
    nubankAccountsByItemId.set(target.account.pluggyItemId, targets);
  }

  for (const [itemId, targets] of nubankAccountsByItemId) {
    for (const type of ['checking', 'caixinha'] as const) {
      const typeTargets = targets.filter((target) => target.type === type);
      if (typeTargets.length === 0) continue;

      try {
        const response = type === 'checking'
          ? await getPluggyAccounts(itemId, apiKey)
          : await getPluggyInvestments(itemId, apiKey);
        const balance = type === 'checking'
          ? calculateNubankCheckingBalance(response)
          : calculateNubankCaixinhaBalance(response);
        if (!balance) {
          skippedCount += typeTargets.length;
          continue;
        }

        for (const { account } of typeTargets) {
          try {
            const updatedAccount = await repository.updateBalance(
              account.id,
              balance.balance,
              balance.updatedAt,
            );
            if (!updatedAccount) throw new Error('Account was removed before its balance could be saved.');
            updatedAccounts.push(updatedAccount);
          } catch (error) {
            failedAccounts.push(account.name);
            console.error(`Could not save Nubank account ${account.id}:`, error);
          }
        }
      } catch (error) {
        failedAccounts.push(...typeTargets.map(({ account }) => account.name));
        console.error(`Could not refresh Nubank ${type} accounts for item ${itemId}:`, error);
      }
    }
  }

  const mercadoPagoAccountsByItemId = new Map<string, typeof mercadoPagoAccounts>();
  for (const account of mercadoPagoAccounts) {
    const targets = mercadoPagoAccountsByItemId.get(account.pluggyItemId) ?? [];
    targets.push(account);
    mercadoPagoAccountsByItemId.set(account.pluggyItemId, targets);
  }

  for (const [itemId, targets] of mercadoPagoAccountsByItemId) {
    try {
      const pluggyAccounts = await getPluggyAccounts(itemId, apiKey);
      const balance = calculateMercadoPagoBalance(pluggyAccounts);
      if (!balance) {
        skippedCount += targets.length;
        continue;
      }

      for (const account of targets) {
        try {
          const updatedAccount = await repository.updateBalance(
            account.id,
            balance.balance,
            balance.updatedAt,
          );
          if (!updatedAccount) throw new Error('Account was removed before its balance could be saved.');
          updatedAccounts.push(updatedAccount);
        } catch (error) {
          failedAccounts.push(account.name);
          console.error(`Could not save Mercado Pago account ${account.id}:`, error);
        }
      }
    } catch (error) {
      failedAccounts.push(...targets.map((account) => account.name));
      console.error(`Could not refresh Mercado Pago item ${itemId}:`, error);
    }
  }

  return {
    updatedCount: updatedAccounts.length,
    skippedCount,
    failedCount: failedAccounts.length,
    failedAccounts,
    updatedAccounts,
  };
}
