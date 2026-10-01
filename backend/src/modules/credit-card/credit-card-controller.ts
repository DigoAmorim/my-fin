import { withErrorHandling } from '../../lib/api-errors';
import {
  createCreditCard as create,
  deleteCreditCard as remove,
  getCreditCard as get,
  listCreditCards as list,
  updateCreditCard as update,
} from './credit-card-service';

export const listCreditCards = withErrorHandling(async (_request, response) => {
  response.json(await list());
});

export const getCreditCard = withErrorHandling(async (request, response) => {
  response.json(await get(request.params.id));
});

export const createCreditCard = withErrorHandling(async (request, response) => {
  response.status(201).json(await create(request.body));
});

export const updateCreditCard = withErrorHandling(async (request, response) => {
  response.json(await update(request.params.id, request.body));
});

export const deleteCreditCard = withErrorHandling(async (request, response) => {
  await remove(request.params.id);
  response.status(204).end();
});