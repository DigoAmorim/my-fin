import { Router } from 'express';
import {
  createCreditCard,
  deleteCreditCard,
  getCreditCard,
  listCreditCards,
  updateCreditCard,
} from './credit-card-controller';

// Mapeia cada endpoint HTTP para a operacao correspondente no controller.
export const creditCardRouter = Router();

creditCardRouter.get('/', listCreditCards);
creditCardRouter.get('/:id', getCreditCard);
creditCardRouter.post('/', createCreditCard);
creditCardRouter.put('/:id', updateCreditCard);
creditCardRouter.delete('/:id', deleteCreditCard);