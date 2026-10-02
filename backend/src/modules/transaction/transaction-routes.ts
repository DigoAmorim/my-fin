import { Router } from 'express';
import {
  createTransaction,
  deleteTransaction,
  getPaymentHistory,
  getTransaction,
  listTransactions,
  payTransactions,
  updateTransaction,
} from './transaction-controller';

// Mantem as operacoes REST da transacao agrupadas sob um router proprio.
export const transactionRouter = Router();

transactionRouter.get('/', listTransactions);
transactionRouter.get('/payments', getPaymentHistory);
transactionRouter.post('/payments', payTransactions);
transactionRouter.get('/:id', getTransaction);
transactionRouter.post('/', createTransaction);
transactionRouter.put('/:id', updateTransaction);
transactionRouter.delete('/:id', deleteTransaction);