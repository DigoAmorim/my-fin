import { ApiError } from '../../lib/api-errors';
import { numberToDecimalString } from '../../lib/decimal';
import { createPluggyApiKey, getPluggyPages } from '../../lib/pluggy-client';
import { parsePositiveId } from '../../lib/request-validation';
import * as bankRepository from '../open-finance/open-finance-repository';
import type { OpenFinanceBank } from '../open-finance/open-finance-types';
import * as repository from './fixed-income-repository';
import type { FixedIncomeSummary, PluggyFixedIncomePosition } from './fixed-income-types';

const MAX_AMOUNT_CENTS = 99_999_999_999_999n;

type FixedIncomeBank = Pick<OpenFinanceBank, 'id' | 'bankName' | 'pluggyItemId' | 'fixedIncome'>;

type PluggyInvestmentPayload = {
  id?: unknown;
  type?: unknown;
  subtype?: unknown;
  amount?: unknown;
  taxes?: unknown;
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

function amountToCents(amount: string): bigint {
  const negative = amount.startsWith('-');
  const [whole, fraction = ''] = amount.replace(/^-/, '').split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return negative ? -cents : cents;
}

function amountFromCents(cents: bigint): string {
  const sign = cents < 0n ? '-' : '';
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}

function subtractTaxes(amount: unknown, taxes: unknown): string {
  const amountCents = amountToCents(normalizeAmount(amount));
  const taxesCents = taxes === undefined || taxes === null
    ? 0n
    : amountToCents(normalizeAmount(taxes));
  if (taxesCents < 0n) throw new ApiError(502, 'pluggyResponseInvalid');

  const netAmountCents = amountCents - taxesCents;
  if (netAmountCents > MAX_AMOUNT_CENTS || netAmountCents < -MAX_AMOUNT_CENTS) {
    throw new ApiError(502, 'pluggyResponseInvalid');
  }
  return amountFromCents(netAmountCents);
}

export function parseFixedIncomePositions(
  input: unknown,
  fallbackUpdatedAt = new Date().toISOString(),
): PluggyFixedIncomePosition[] {
  const body = typeof input === 'object' && input !== null && !Array.isArray(input)
    ? input as Record<string, unknown>
    : null;
  if (!body || !Array.isArray(body.results)) throw new ApiError(502, 'pluggyResponseInvalid');

  const positions: PluggyFixedIncomePosition[] = [];
  for (const value of body.results) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ApiError(502, 'pluggyResponseInvalid');
    }
    const item = value as PluggyInvestmentPayload;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const type = typeof item.type === 'string' ? item.type.trim() : '';
    if (!type) throw new ApiError(502, 'pluggyResponseInvalid');
    if (type.toUpperCase() !== 'FIXED_INCOME') continue;

    const subtype = typeof item.subtype === 'string' ? item.subtype.trim() : '';
    const updatedAt = typeof item.date === 'string' ? new Date(item.date) : new Date(fallbackUpdatedAt);
    if (!id || !subtype || Number.isNaN(updatedAt.getTime())) {
      throw new ApiError(502, 'pluggyResponseInvalid');
    }

    positions.push({
      id,
      subtype,
      amount: subtractTaxes(item.amount, item.taxes),
      updatedAt: updatedAt.toISOString(),
    });
  }
  return positions;
}

export function sumFixedIncomeAmounts<T extends { amount: string }>(positions: T[]): string {
  const cents = positions.reduce((sum, position) => {
    return sum + amountToCents(position.amount);
  }, 0n);
  return amountFromCents(cents);
}

export function groupFixedIncomePositions(
  positions: PluggyFixedIncomePosition[],
): PluggyFixedIncomePosition[] {
  const groups = new Map<string, PluggyFixedIncomePosition[]>();
  for (const position of positions) {
    groups.set(position.subtype, [...(groups.get(position.subtype) ?? []), position]);
  }

  return [...groups.entries()].map(([subtype, group]) => ({
    id: subtype,
    subtype,
    amount: sumFixedIncomeAmounts(group),
    updatedAt: group.reduce(
      (latest, position) => position.updatedAt > latest ? position.updatedAt : latest,
      group[0].updatedAt,
    ),
  }));
}

async function getFixedIncomePositions(
  apiKey: string,
  bank: FixedIncomeBank,
): Promise<PluggyFixedIncomePosition[]> {
  const results = await getPluggyPages(apiKey, '/investments', {
    itemId: bank.pluggyItemId,
    type: 'FIXED_INCOME',
  });
  return parseFixedIncomePositions({ results });
}

export async function synchronizeFixedIncome(
  apiKey?: string,
): Promise<{ synchronizedInvestments: number }> {
  const banks = await bankRepository.findAll();
  const enabledBanks = banks.filter((bank: FixedIncomeBank) => bank.fixedIncome);
  if (enabledBanks.length === 0) return { synchronizedInvestments: 0 };

  const token = apiKey ?? await createPluggyApiKey();
  const batches = await Promise.all(enabledBanks.map(async (bank) => ({
    bank: { id: bank.id, bankName: bank.bankName },
    positions: groupFixedIncomePositions(await getFixedIncomePositions(token, bank)),
  })));
  const synchronizedInvestments = await repository.upsertFixedIncome(batches);
  return { synchronizedInvestments };
}

export async function getFixedIncomeSummary(): Promise<FixedIncomeSummary> {
  const positions = await repository.findAllFixedIncome();
  return { total: sumFixedIncomeAmounts(positions), investments: positions };
}

export async function deleteFixedIncomePosition(idInput: unknown): Promise<void> {
  const id = parsePositiveId(idInput);
  if (!await repository.removeFixedIncomePosition(id)) throw new ApiError(404, 'accountNotFound');
}