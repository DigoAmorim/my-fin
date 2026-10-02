import { withErrorHandling } from '../../lib/api-errors';
import {
  createTransaction as create,
  deleteTransaction as remove,
  getPaymentHistory as getHistory,
  getTransaction as get,
  listTransactions as list,
  payTransactions as pay,
  updateTransaction as update,
} from './transaction-service';

// Converte cada endpoint HTTP em uma chamada ao service e define o status da resposta.
export const listTransactions = withErrorHandling(async (_request, response) => {
  response.json(await list());
});

export const payTransactions = withErrorHandling(async (request, response) => {
  response.json(await pay(request.body));
});

export const getPaymentHistory = withErrorHandling(async (request, response) => {
  response.json(await getHistory(request.query.creditCardId, request.query.month));
});

export const getTransaction = withErrorHandling(async (request, response) => {
  response.json(await get(request.params.id));
});

export const createTransaction = withErrorHandling(async (request, response) => {
  response.status(201).json(await create(request.body));
});

export const updateTransaction = withErrorHandling(async (request, response) => {
  response.json(await update(request.params.id, request.body));
});

export const deleteTransaction = withErrorHandling(async (request, response) => {
  await remove(request.params.id);
  response.status(204).end();
});