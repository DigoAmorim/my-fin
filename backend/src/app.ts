import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { ApiError, apiErrorMiddleware } from './lib/api-errors';
import { accountRouter } from './modules/account/account-routes';
import { creditCardRouter } from './modules/credit-card/credit-card-routes';
import { fixedIncomeRouter } from './modules/fixed-income/fixed-income-routes';
import { openFinanceRouter } from './modules/open-finance/open-finance-routes';
import { paymentRouter } from './modules/payment/payment-routes';
import { purchaseLimitRouter } from './modules/purchase-limit/purchase-limit-routes';
import { transactionRouter } from './modules/transaction/transaction-routes';
import { variableIncomeRouter } from './modules/variable-income/variable-income-routes';
import { healthRouter } from './routes/health';

export const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Non-browser clients may omit Origin; browser requests must match configured origins.
      if (!origin || env.webOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new ApiError(403, 'originNotAllowed'));
    },
  }),
);
// Keep the parser's resource limit explicit to prevent oversized request bodies.
app.use(express.json({ limit: '100kb' }));
app.use('/api/health', healthRouter);
// Todas as rotas do modulo de cartao compartilham este prefixo.
app.use('/api/credit-cards', creditCardRouter);
app.use('/api/accounts', accountRouter);
app.use('/api/investments', fixedIncomeRouter);
app.use('/api/variable-investments', variableIncomeRouter);
app.use('/api/open-finance', openFinanceRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/purchase-limits', purchaseLimitRouter);
// Todas as rotas de compras/transacoes compartilham este prefixo.
app.use('/api/transactions', transactionRouter);
app.use(apiErrorMiddleware);