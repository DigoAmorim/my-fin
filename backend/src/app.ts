import cors from 'cors';
import express from 'express';
import { creditCardRouter } from './modules/credit-card/credit-card-routes';
import { healthRouter } from './routes/health';

export const app = express();

const allowedOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:5173')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true);
				return;
			}

			callback(new Error('Not allowed by CORS'));
		},
	}),
);
app.use(express.json());
app.use('/api/health', healthRouter);
// Todas as rotas do modulo de cartao compartilham este prefixo.
app.use('/api/credit-cards', creditCardRouter);