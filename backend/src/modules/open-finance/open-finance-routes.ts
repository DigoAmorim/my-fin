import { Router } from 'express';
import {
  createOpenFinanceBank,
  deleteOpenFinanceBank,
  listOpenFinanceBanks,
  updateOpenFinanceBank,
} from './open-finance-controller';

export const openFinanceRouter = Router();

openFinanceRouter.get('/banks', listOpenFinanceBanks);
openFinanceRouter.post('/banks', createOpenFinanceBank);
openFinanceRouter.put('/banks/:id', updateOpenFinanceBank);
openFinanceRouter.delete('/banks/:id', deleteOpenFinanceBank);
