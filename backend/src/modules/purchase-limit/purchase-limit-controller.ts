import { withErrorHandling } from '../../lib/api-errors';
import {
  createPurchaseLimit as create,
  deletePurchaseLimit as remove,
  listPurchaseLimits as list,
  updatePurchaseLimit as update,
} from './purchase-limit-service';

export const listPurchaseLimits = withErrorHandling(async (_request, response) => {
  response.json(await list());
});

export const createPurchaseLimit = withErrorHandling(async (request, response) => {
  response.status(201).json(await create(request.body));
});

export const updatePurchaseLimit = withErrorHandling(async (request, response) => {
  response.json(await update(request.params.id, request.body));
});

export const deletePurchaseLimit = withErrorHandling(async (request, response) => {
  await remove(request.params.id);
  response.status(204).end();
});
