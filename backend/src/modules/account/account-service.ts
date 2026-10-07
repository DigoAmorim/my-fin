import { ApiError } from '../../lib/api-errors';
import { createPluggyApiKey, getPluggyPages } from '../../lib/pluggy-client';
import { asRecord, parsePositiveId } from '../../lib/request-validation';
import * as repository from './account-repository';
import type { AccountFields, AccountType, PluggyAccount } from './account-types';

const MAX_BALANCE = 999_999_999_999.99;

function isAccountType(value: unknown): value is AccountType {
  return value === 'checking' || value === 'savings' || value === 'fixed_income';
}

export function parseManualAccountFields(input: unknown): AccountFields {
  const body = asRecord(input);
  const bankName = typeof body.bankName === 'string' ? body.bankName.trim() : '';
  const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber.trim() : '';
  const accountType = body.accountType;
  const balance = typeof body.balance === 'string' || typeof body.balance === 'number'
    ? String(body.balance).trim()
    : '';
  const updatedAtText = typeof body.updatedAt === 'string' ? body.updatedAt : '';
  const updatedAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(updatedAtText)
    ? new Date(updatedAtText)
    : null;

  if (!bankName) throw new ApiError(400, 'accountBankNameRequired');
  if (Array.from(bankName).length > 100) throw new ApiError(400, 'accountBankNameMaxLength');
  if (!accountNumber) throw new ApiError(400, 'accountNumberRequired');
  if (accountNumber.length > 100) throw new ApiError(400, 'accountNumberMaxLength');
  if (!isAccountType(accountType)) throw new ApiError(400, 'accountTypeInvalid');
  if (!/^-?\d+(?:\.\d+)?$/.test(balance)) {
    throw new ApiError(400, 'accountBalanceInvalid');
  }
  if ((balance.split('.')[1]?.length ?? 0) > 2) {
    throw new ApiError(400, 'accountBalanceMaxDecimals');
  }
  if (Math.abs(Number(balance)) > MAX_BALANCE) throw new ApiError(400, 'accountBalanceMaxValue');
  if (!updatedAt || Number.isNaN(updatedAt.getTime())) {
    throw new ApiError(400, 'accountUpdatedAtInvalid');
  }

  return {
    bankName,
    accountNumber,
    accountType,
    balance,
    updatedAt: updatedAt.toISOString(),
  };
}

export async function listAccounts(accountType?: AccountType) {
  return repository.findAll(accountType);
}

export async function createManualAccount(input: unknown) {
  const body = asRecord(input);
  if (body.id !== undefined) throw new ApiError(400, 'accountIdGenerated');
  return repository.createManual(parseManualAccountFields(body));
}

export async function updateManualAccount(idInput: unknown, input: unknown) {
  const id = parsePositiveId(idInput);
  const body = asRecord(input);
  if (body.id !== undefined && body.id !== id) throw new ApiError(400, 'accountIdImmutable');

  const account = await repository.updateManual(id, parseManualAccountFields(body));
  if (account) return account;

  const existing = await repository.findById(id);
  if (!existing) throw new ApiError(404, 'accountNotFound');
  throw new ApiError(409, 'accountManagedByPluggy');
}

export async function deleteAccount(idInput: unknown): Promise<void> {
  const id = parsePositiveId(idInput);
  if (!await repository.remove(id)) throw new ApiError(404, 'accountNotFound');
}

type PluggyAccountPayload = {
  id?: unknown;
  number?: unknown;
  subtype?: unknown;
  balance?: unknown;
  updatedAt?: unknown;
};

export function parsePluggyAccounts(input: unknown, bank: repository.OpenFinanceBankRow): PluggyAccount[] {
  const body = typeof input === 'object' && input !== null && !Array.isArray(input)
    ? input as Record<string, unknown>
    : null;
  if (!body || !Array.isArray(body.results)) throw new ApiError(502, 'pluggyResponseInvalid');

  const accounts: PluggyAccount[] = [];
  for (const value of body.results) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ApiError(502, 'pluggyResponseInvalid');
    }

    const account = value as PluggyAccountPayload;
    const subtype = typeof account.subtype === 'string' ? account.subtype.toUpperCase() : '';
    const accountType: AccountType | undefined = subtype === 'CHECKING_ACCOUNT'
      ? 'checking'
      : subtype === 'SAVINGS_ACCOUNT'
        ? 'savings'
        : subtype === 'FIXED_INCOME'
          ? 'fixed_income'
          : undefined;
    if (!accountType) continue;
    if ((accountType === 'checking' && !bank.checking_account)
      || (accountType === 'savings' && !bank.savings_account)
      || (accountType === 'fixed_income' && !bank.fixed_income)) continue;

    const balance = typeof account.balance === 'number' && Number.isFinite(account.balance)
      ? String(account.balance)
      : typeof account.balance === 'string' && account.balance.trim() !== ''
        ? account.balance.trim()
        : '';
    const updatedAt = typeof account.updatedAt === 'string' ? new Date(account.updatedAt) : null;
    if (
      typeof account.id !== 'string'
      || !account.id.trim()
      || typeof account.number !== 'string'
      || !account.number.trim()
      || !/^-?\d+(?:\.\d{1,2})?$/.test(balance)
      || Math.abs(Number(balance)) > MAX_BALANCE
      || !updatedAt
      || Number.isNaN(updatedAt.getTime())
    ) {
      throw new ApiError(502, 'pluggyResponseInvalid');
    }

    accounts.push({
      id: account.id.trim(),
      number: account.number.trim(),
      subtype: accountType,
      balance,
      updatedAt: updatedAt.toISOString(),
    });
  }

  return accounts;
}

async function getPluggyAccounts(
  apiKey: string,
  bank: repository.OpenFinanceBankRow,
): Promise<PluggyAccount[]> {
  const results = await getPluggyPages(apiKey, '/accounts', { itemId: bank.pluggy_item_id });
  return parsePluggyAccounts({ results }, bank);
}

export async function synchronizeAccounts(
  apiKey?: string,
): Promise<{ synchronizedAccounts: number }> {
  const banks = await repository.findForSynchronization();
  if (banks.length === 0) return { synchronizedAccounts: 0 };

  const token = apiKey ?? await createPluggyApiKey();
  const batches: Array<{ bank: repository.OpenFinanceBankRow; accounts: PluggyAccount[] }> = [];
  for (const bank of banks) {
    batches.push({ bank, accounts: await getPluggyAccounts(token, bank) });
  }

  const synchronizedAccounts = await repository.upsertPluggyAccounts(batches);
  return { synchronizedAccounts };
}
