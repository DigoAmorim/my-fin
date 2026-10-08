import { Router } from 'express';
import {
  createPayment,
  deletePayment,
  listPayments,
  updatePayment,
} from './payment-controller';

export const paymentRouter = Router();

paymentRouter.get('/', listPayments);
paymentRouter.post('/', createPayment);
paymentRouter.put('/:id', updatePayment);
paymentRouter.delete('/:id', deletePayment);
