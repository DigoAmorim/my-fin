import { withErrorHandling } from '../../lib/api-errors';
import { createPluggyApiKey } from '../../lib/pluggy-client';
import { synchronizeAccounts as synchronize } from '../account/account-service';
import { synchronizeFixedIncome } from '../fixed-income/fixed-income-service';
import {
  createOpenFinanceBank as create,
  deleteOpenFinanceBank as remove,
  listOpenFinanceBanks as list,
  updateOpenFinanceBank as update,
} from './open-finance-service';

export const listOpenFinanceBanks = withErrorHandling(async (_request, response) => {
  response.json(await list());
});

export const createOpenFinanceBank = withErrorHandling(async (request, response) => {
  response.status(201).json(await create(request.body));
});

export const updateOpenFinanceBank = withErrorHandling(async (request, response) => {
  response.json(await update(request.params.id, request.body));
});

export const deleteOpenFinanceBank = withErrorHandling(async (request, response) => {
  await remove(request.params.id);
  response.status(204).end();
});

export const synchronizeOpenFinanceAccounts = withErrorHandling(async (_request, response) => {
  const banks = await list();
  if (banks.length === 0) {
    response.json({ synchronizedAccounts: 0, synchronizedInvestments: 0 });
    return;
  }

  const apiKey = await createPluggyApiKey();
  const [accounts, investments] = await Promise.all([
    synchronize(apiKey),
    synchronizeFixedIncome(apiKey),
  ]);
  response.json({ ...accounts, ...investments });
});
