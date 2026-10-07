import { withErrorHandling } from '../../lib/api-errors';
import { deleteFixedIncomePosition, getFixedIncomeSummary } from './fixed-income-service';

export const getFixedIncome = withErrorHandling(async (_request, response) => {
  response.json(await getFixedIncomeSummary());
});

export const deleteFixedIncomePositionById = withErrorHandling(async (request, response) => {
  await deleteFixedIncomePosition(request.params.id);
  response.status(204).end();
});