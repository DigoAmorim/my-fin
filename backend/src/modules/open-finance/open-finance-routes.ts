import { Router } from 'express';
import {
  createOpenFinanceBank,
  deleteOpenFinanceBank,
  listOpenFinanceBanks,
  synchronizeOpenFinanceAccounts,
  updateOpenFinanceBank,
} from './open-finance-controller';

export const openFinanceRouter = Router();

openFinanceRouter.get('/banks', listOpenFinanceBanks);
openFinanceRouter.post('/sync-accounts', synchronizeOpenFinanceAccounts);
openFinanceRouter.post('/banks', createOpenFinanceBank);
openFinanceRouter.put('/banks/:id', updateOpenFinanceBank);
openFinanceRouter.delete('/banks/:id', deleteOpenFinanceBank);
