import { withErrorHandling } from '../../lib/api-errors';
import {
  createPayment as create,
  deletePayment as remove,
  listPayments as list,
  updatePayment as update,
} from './payment-service';

export const listPayments = withErrorHandling(async (_request, response) => {
  response.json(await list());
});

export const createPayment = withErrorHandling(async (request, response) => {
  response.status(201).json(await create(request.body));
});

export const updatePayment = withErrorHandling(async (request, response) => {
  response.json(await update(request.params.id, request.body));
});

export const deletePayment = withErrorHandling(async (request, response) => {
  await remove(request.params.id);
  response.status(204).end();
});
