import { Router } from 'express';
import {
  createAccount,
  deleteAccount,
  listAccounts,
  refreshAccounts,
  updateAccount,
} from './account-controller';

export const accountRouter = Router();

accountRouter.post('/refresh', refreshAccounts);
accountRouter.get('/', listAccounts);
accountRouter.post('/', createAccount);
accountRouter.put('/:id', updateAccount);
accountRouter.delete('/:id', deleteAccount);
