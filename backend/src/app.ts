import cors from 'cors';
import express from 'express';
import { healthRouter } from './routes/health';

export const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/health', healthRouter);