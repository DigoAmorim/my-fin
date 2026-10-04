import { withErrorHandling } from '../../lib/api-errors';
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
