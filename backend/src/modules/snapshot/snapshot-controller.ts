import { withErrorHandling } from '../../lib/api-errors';
import { findPortfolioEvolution } from './snapshot-repository';

export const getPortfolioEvolution = withErrorHandling(async (_request, response) => {
  response.json(await findPortfolioEvolution());
});
