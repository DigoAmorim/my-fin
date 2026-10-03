import { Router } from 'express';
import {
  createPurchaseLimit,
  deletePurchaseLimit,
  listPurchaseLimits,
  updatePurchaseLimit,
} from './purchase-limit-controller';

export const purchaseLimitRouter = Router();

purchaseLimitRouter.get('/', listPurchaseLimits);
purchaseLimitRouter.post('/', createPurchaseLimit);
purchaseLimitRouter.put('/:id', updatePurchaseLimit);
purchaseLimitRouter.delete('/:id', deletePurchaseLimit);
