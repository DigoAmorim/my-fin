import { ApiError } from '../../lib/api-errors';
import { numberToDecimalString } from '../../lib/decimal';
import { createPluggyApiKey, getPluggyPages } from '../../lib/pluggy-client';
import { parsePositiveId } from '../../lib/request-validation';
import * as bankRepository from '../open-finance/open-finance-repository';
import type { OpenFinanceBank } from '../open-finance/open-finance-types';
import * as repository from './variable-income-repository';
import type {
  PluggyVariableIncomePosition,
  VariableIncomeSummary,
} from './variable-income-types';

const MAX_AMOUNT_CENTS = 99_999_999_999_999n;

type VariableIncomeBank = Pick<OpenFinanceBank, 'id' | 'pluggyItemId' | 'variableIncome'>;
type PluggyEquityPayload = {
  id?: unknown;
  type?: unknown;
  subtype?: unknown;
  name?: unknown;
  quantity?: unknown;
  value?: unknown;
  Value?: unknown;
  amount?: unknown;
  date?: unknown;
};

function normalizeAmount(value: unknown): string {
  const amount = typeof value === 'number' && Number.isFinite(value)
    ? numberToDecimalString(value)
    : typeof value === 'string' && value.trim() !== ''
      ? value.trim()
      : '';

  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(amount);
  if (!match) throw new ApiError(502, 'pluggyResponseInvalid');

  const [, sign, whole, fraction = ''] = match;
  let cents = BigInt(whole) * 100n + BigInt(fraction.slice(0, 2).padEnd(2, '0'));
  if (fraction[2] && fraction[2] >= '5') cents += 1n;
  if (cents > MAX_AMOUNT_CENTS) throw new ApiError(502, 'pluggyResponseInvalid');

  const roundedSign = sign && cents > 0n ? '-' : '';
  return `${roundedSign}${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

function normalizeQuantity(value: unknown): string {
  const quantity = typeof value === 'number' && Number.isFinite(value)
    ? numberToDecimalString(value)
    : typeof value === 'string' && value.trim() !== ''
      ? value.trim()
      : '';
  if (!/^\d+(?:\.\d{1,10})?$/.test(quantity)) {
    throw new ApiError(502, 'pluggyResponseInvalid');
  }
  const [whole] = quantity.split('.');
  if (whole.replace(/^0+/, '').length > 14) throw new ApiError(502, 'pluggyResponseInvalid');
  return quantity;
}

export function parseVariableIncomePositions(input: unknown): PluggyVariableIncomePosition[] {
  const body = typeof input === 'object' && input !== null && !Array.isArray(input)
    ? input as Record<string, unknown>
    : null;
  if (!body || !Array.isArray(body.results)) throw new ApiError(502, 'pluggyResponseInvalid');

  const positions: PluggyVariableIncomePosition[] = [];
  for (const value of body.results) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ApiError(502, 'pluggyResponseInvalid');
    }
    const item = value as PluggyEquityPayload;
    if (typeof item.type !== 'string' || item.type.toUpperCase() !== 'EQUITY') continue;
    if (typeof item.subtype !== 'string' || item.subtype.toUpperCase() !== 'STOCK') continue;

    const amount = normalizeAmount(item.amount);
    if (amount === '0.00') continue;

    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const assetName = typeof item.name === 'string' ? item.name.trim() : '';
    const updatedAt = typeof item.date === 'string' ? new Date(item.date) : new Date();
    if (
      !id
      || id.length > 100
      || !assetName
      || Array.from(assetName).length > 100
      || Number.isNaN(updatedAt.getTime())
    ) {
      throw new ApiError(502, 'pluggyResponseInvalid');
    }

    positions.push({
      id,
      assetName,
      type: 'EQUITY',
      quantity: normalizeQuantity(item.quantity),
      unitValue: normalizeAmount(item.value ?? item.Value),
      amount,
      updatedAt: updatedAt.toISOString(),
    });
  }
  return positions;
}

async function getVariableIncomePositions(
  apiKey: string,
  bank: VariableIncomeBank,
): Promise<PluggyVariableIncomePosition[]> {
  const results = await getPluggyPages(apiKey, '/investments', {
    itemId: bank.pluggyItemId,
    type: 'EQUITY',
  });
  return parseVariableIncomePositions({ results });
}

export async function synchronizeVariableIncome(
  apiKey?: string,
): Promise<{ synchronizedVariableInvestments: number }> {
  const banks = await bankRepository.findAll();
  const enabledBanks = banks.filter((bank: VariableIncomeBank) => bank.variableIncome);
  if (enabledBanks.length === 0) return { synchronizedVariableInvestments: 0 };

  const token = apiKey ?? await createPluggyApiKey();
  const batches = await Promise.all(enabledBanks.map(async (bank) => ({
    bank: { id: bank.id },
    positions: await getVariableIncomePositions(token, bank),
  })));
  const synchronizedVariableInvestments = await repository.upsert(batches);
  return { synchronizedVariableInvestments };
}

export async function getVariableIncomeSummary(): Promise<VariableIncomeSummary> {
  const investments = await repository.findAll();
  const totalCents = investments.reduce((total, investment) => {
    const negative = investment.amount.startsWith('-');
    const [whole, fraction = ''] = investment.amount.replace(/^-/, '').split('.');
    const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
    return total + (negative ? -cents : cents);
  }, 0n);
  const sign = totalCents < 0n ? '-' : '';
  const absolute = totalCents < 0n ? -totalCents : totalCents;
  return {
    total: `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`,
    investments,
  };
}

export async function deleteVariableIncomePosition(idInput: unknown): Promise<void> {
  const id = parsePositiveId(idInput);
  if (!await repository.remove(id)) throw new ApiError(404, 'accountNotFound');
}
