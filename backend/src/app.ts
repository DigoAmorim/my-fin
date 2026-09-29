import cors from 'cors';
import express from 'express';
import { creditCardRouter } from './modules/credit-card/routes';
import { healthRouter } from './routes/health';

export const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/health', healthRouter);
// Todas as rotas do modulo de cartao compartilham este prefixo.
app.use('/api/credit-cards', creditCardRouter);