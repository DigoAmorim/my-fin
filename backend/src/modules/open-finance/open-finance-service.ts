import { ApiError } from '../../lib/api-errors';
import { asRecord, parsePositiveId } from '../../lib/request-validation';
import * as repository from './open-finance-repository';
import type { OpenFinanceBankFields } from './open-finance-types';

function parseOption(body: Record<string, unknown>, key: string): boolean {
  const value = body[key];
  if (typeof value !== 'boolean') throw new ApiError(400, 'openFinanceOptionsInvalid');
  return value;
}

export function parseOpenFinanceBankFields(input: unknown): OpenFinanceBankFields {
  const body = asRecord(input);
  const bankName = typeof body.bankName === 'string' ? body.bankName.trim() : '';
  const pluggyItemId = typeof body.pluggyItemId === 'string' ? body.pluggyItemId.trim() : '';

  if (!bankName) throw new ApiError(400, 'openFinanceBankNameRequired');
  if (Array.from(bankName).length > 100) throw new ApiError(400, 'openFinanceBankNameMaxLength');
  if (!pluggyItemId) throw new ApiError(400, 'openFinancePluggyItemIdRequired');
  if (pluggyItemId.length > 100) throw new ApiError(400, 'openFinancePluggyItemIdMaxLength');

  const checkingAccount = parseOption(body, 'checkingAccount');
  const savingsAccount = parseOption(body, 'savingsAccount');
  const fixedIncome = parseOption(body, 'fixedIncome');
  const variableIncome = parseOption(body, 'variableIncome');

  if (!checkingAccount && !savingsAccount && !fixedIncome && !variableIncome) {
    throw new ApiError(400, 'openFinanceOptionRequired');
  }

  return {
    bankName,
    checkingAccount,
    savingsAccount,
    fixedIncome,
    variableIncome,
    pluggyItemId,
  };
}

export async function listOpenFinanceBanks() {
  return repository.findAll();
}

export async function createOpenFinanceBank(input: unknown) {
  const body = asRecord(input);
  if (body.id !== undefined) throw new ApiError(400, 'openFinanceBankIdGenerated');

  return repository.create(parseOpenFinanceBankFields(body));
}

export async function updateOpenFinanceBank(idInput: unknown, input: unknown) {
  const id = parsePositiveId(idInput);
  const body = asRecord(input);
  if (body.id !== undefined && body.id !== id) {
    throw new ApiError(400, 'openFinanceBankIdImmutable');
  }

  const bank = await repository.update(id, parseOpenFinanceBankFields(body));
  if (!bank) throw new ApiError(404, 'openFinanceBankNotFound');
  return bank;
}

export async function deleteOpenFinanceBank(idInput: unknown): Promise<void> {
  const id = parsePositiveId(idInput);
  if (!await repository.remove(id)) throw new ApiError(404, 'openFinanceBankNotFound');
}
