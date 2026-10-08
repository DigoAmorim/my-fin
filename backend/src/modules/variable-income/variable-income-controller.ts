import { withErrorHandling } from '../../lib/api-errors';
import {
  deleteVariableIncomePosition,
  getVariableIncomeSummary,
} from './variable-income-service';

export const getVariableIncome = withErrorHandling(async (_request, response) => {
  response.json(await getVariableIncomeSummary());
});

export const deleteVariableIncomePositionById = withErrorHandling(async (request, response) => {
  await deleteVariableIncomePosition(request.params.id);
  response.status(204).end();
});
