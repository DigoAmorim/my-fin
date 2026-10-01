import { Router } from 'express';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from './transaction-controller';

// Mantem as operacoes REST da transacao agrupadas sob um router proprio.
export const transactionRouter = Router();

transactionRouter.get('/', listTransactions);
transactionRouter.get('/:id', getTransaction);
transactionRouter.post('/', createTransaction);
transactionRouter.put('/:id', updateTransaction);
transactionRouter.delete('/:id', deleteTransaction);