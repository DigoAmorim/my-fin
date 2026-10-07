import { Router } from 'express';
import { deleteFixedIncomePositionById, getFixedIncome } from './fixed-income-controller';

export const fixedIncomeRouter = Router();

fixedIncomeRouter.get('/', getFixedIncome);
fixedIncomeRouter.delete('/:id', deleteFixedIncomePositionById);