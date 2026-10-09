import { Router } from 'express';
import { getPortfolioEvolution } from './snapshot-controller';

export const snapshotRouter = Router();

snapshotRouter.get('/evolution', getPortfolioEvolution);
