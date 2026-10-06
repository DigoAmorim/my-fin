import { withErrorHandling } from '../../lib/api-errors';
import {
  createManualAccount as create,
  deleteAccount as remove,
  listAccounts as list,
  updateManualAccount as update,
} from './account-service';

export const listAccounts = withErrorHandling(async (_request, response) => {
  response.json(await list());
});

export const createAccount = withErrorHandling(async (request, response) => {
  response.status(201).json(await create(request.body));
});

export const updateAccount = withErrorHandling(async (request, response) => {
  response.json(await update(request.params.id, request.body));
});

export const deleteAccount = withErrorHandling(async (request, response) => {
  await remove(request.params.id);
  response.status(204).end();
});
