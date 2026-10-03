import { Router } from 'express';
import { pool } from '../../database/pool';

export const healthRouter = Router();

healthRouter.get('/', (_request, response) => {
  response.json({ status: 'ok', service: 'api' });
});

healthRouter.get('/ready', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', service: 'api', database: 'ok' });
  } catch (error) {
    console.error('Database readiness check failed:', error);
    response.status(503).json({ status: 'error', service: 'api', database: 'unavailable' });
  }
});