import { withErrorHandling } from '../../lib/api-errors';
import {
  createManualAccount as create,
  deleteAccount as remove,
  listAccounts as list,
  updateManualAccount as update,
} from './account-service';
import type { AccountType } from './account-types';

export const listAccounts = withErrorHandling(async (request, response) => {
  const accountType = request.query.type;
  const normalizedType = typeof accountType === 'string'
    && (accountType === 'checking' || accountType === 'savings' || accountType === 'fixed_income')
    ? accountType as AccountType
    : undefined;
  response.json(await list(normalizedType));
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
