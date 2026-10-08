import { Router } from 'express';
import {
  deleteVariableIncomePositionById,
  getVariableIncome,
} from './variable-income-controller';

export const variableIncomeRouter = Router();

variableIncomeRouter.get('/', getVariableIncome);
variableIncomeRouter.delete('/:id', deleteVariableIncomePositionById);
