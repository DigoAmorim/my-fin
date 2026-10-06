import { Router } from 'express';
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
} from './account-controller';

export const accountRouter = Router();

accountRouter.get('/', listAccounts);
accountRouter.post('/', createAccount);
accountRouter.put('/:id', updateAccount);
accountRouter.delete('/:id', deleteAccount);
