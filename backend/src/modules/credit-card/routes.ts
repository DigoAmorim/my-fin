import { Router } from 'express';
import {
  createCreditCard,
  deleteCreditCard,
  getCreditCard,
  listCreditCards,
  updateCreditCard,
} from './controller';

// Mapeia cada endpoint HTTP para a operacao correspondente no controller.
export const creditCardRouter = Router();

creditCardRouter.get('/', listCreditCards);
creditCardRouter.get('/:code', getCreditCard);
creditCardRouter.post('/', createCreditCard);
creditCardRouter.put('/:code', updateCreditCard);
creditCardRouter.delete('/:code', deleteCreditCard);