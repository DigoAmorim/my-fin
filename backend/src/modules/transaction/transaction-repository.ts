import { pool } from '../../../database/pool';
import type {
  PaidTransaction,
  PaymentHistory,
  PaymentInput,
  PaymentResult,
  Transaction,
  TransactionFields,
} from './transaction-types';

interface TransactionRow {
  id: number;
  credit_card_id: number;
  current_installment: string;
  total_installments: string;
  installment_amount: string;
  debtor: string | null;
  transaction_type: Transaction['transactionType'];
  description: string | null;
  transaction_date: string;
  purchase_type: Transaction['purchaseType'];
}

interface PaymentHistoryRow extends TransactionRow {
  source_transaction_id: number;
  payment_month: string;
}

const TRANSACTION_COLUMNS = `
  id, credit_card_id, current_installment, total_installments, installment_amount, debtor,
  transaction_type, description, transaction_date::text AS transaction_date, purchase_type
`;

const PAYMENT_HISTORY_COLUMNS = `
  id, source_transaction_id, credit_card_id, current_installment, total_installments,
  installment_amount, debtor, transaction_type, description,
  transaction_date::text AS transaction_date, purchase_type,
  to_char(payment_month, 'YYYY-MM') AS payment_month
`;

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    creditCardId: row.credit_card_id,
    currentInstallment: Number(row.current_installment),
    totalInstallments: Number(row.total_installments),
    installmentAmount: row.installment_amount,
    debtor: row.debtor,
    transactionType: row.transaction_type,
    description: row.description,
    date: row.transaction_date,
    purchaseType: row.purchase_type,
  };
}

// Este modulo concentra o SQL e mapeia colunas snake_case para o contrato da API.
export async function findAll(): Promise<Transaction[]> {
  const result = await pool.query<TransactionRow>(`
    SELECT ${TRANSACTION_COLUMNS}
    FROM my_fin.credit_card_transaction
    ORDER BY transaction_date DESC, id DESC
  `);

  return result.rows.map(toTransaction);
}

export async function findById(id: number): Promise<Transaction | undefined> {
  const result = await pool.query<TransactionRow>(
    `SELECT ${TRANSACTION_COLUMNS}
     FROM my_fin.credit_card_transaction WHERE id = $1`,
    [id],
  );

  const row = result.rows[0];
  return row ? toTransaction(row) : undefined;
}

export async function create(fields: TransactionFields): Promise<Transaction> {
  const result = await pool.query<TransactionRow>(
    `INSERT INTO my_fin.credit_card_transaction
      (credit_card_id, current_installment, total_installments, installment_amount, debtor, transaction_type,
       description, transaction_date, purchase_type)
     VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING ${TRANSACTION_COLUMNS}`,
    [
      fields.creditCardId,
      fields.totalInstallments,
      fields.installmentAmount,
      fields.debtor,
      fields.transactionType,
      fields.description,
      fields.date,
      fields.purchaseType,
    ],
  );

  return toTransaction(result.rows[0]);
}

export async function update(id: number, fields: TransactionFields): Promise<Transaction | undefined> {
  const result = await pool.query<TransactionRow>(
    `UPDATE my_fin.credit_card_transaction
    SET credit_card_id = $2, total_installments = $3, installment_amount = $4,
         debtor = $5, transaction_type = $6, description = $7,
         transaction_date = $8, purchase_type = $9
     WHERE id = $1
    RETURNING ${TRANSACTION_COLUMNS}`,
    [
      id,
      fields.creditCardId,
      fields.totalInstallments,
      fields.installmentAmount,
      fields.debtor,
      fields.transactionType,
      fields.description,
      fields.date,
      fields.purchaseType,
    ],
  );

  const row = result.rows[0];
  return row ? toTransaction(row) : undefined;
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM my_fin.credit_card_transaction WHERE id = $1',
    [id],
  );

  return result.rowCount === 1;
}

export class PaymentSelectionError extends Error {}

export async function paySelectedTransactions(input: PaymentInput): Promise<PaymentResult> {
  const client = await pool.connect();
  const removedTransactionIds: number[] = [];
  const updatedTransactions: Transaction[] = [];

  try {
    await client.query('BEGIN');
    // Lock every selected row before snapshotting so concurrent payments cannot use stale installment numbers.
    const selected = await client.query<TransactionRow>(
      `SELECT ${TRANSACTION_COLUMNS}
       FROM my_fin.credit_card_transaction
       WHERE id = ANY($1::integer[]) AND credit_card_id = $2
       ORDER BY id
       FOR UPDATE`,
      [input.transactionIds, input.creditCardId],
    );

    if (selected.rowCount !== input.transactionIds.length) {
      throw new PaymentSelectionError();
    }

    // The snapshot and the matching delete/advance must commit or roll back together.
    for (const row of selected.rows) {
      await client.query(
        `INSERT INTO my_fin.credit_card_payment
          (source_transaction_id, credit_card_id, current_installment, total_installments,
           installment_amount, debtor, transaction_type, description, transaction_date,
           purchase_type, payment_month)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          row.id,
          row.credit_card_id,
          row.current_installment,
          row.total_installments,
          row.installment_amount,
          row.debtor,
          row.transaction_type,
          row.description,
          row.transaction_date,
          row.purchase_type,
          input.paymentMonth,
        ],
      );

      if (row.purchase_type !== 'recurring' && row.current_installment === row.total_installments) {
        await client.query('DELETE FROM my_fin.credit_card_transaction WHERE id = $1', [row.id]);
        removedTransactionIds.push(row.id);
      } else if (row.purchase_type !== 'recurring') {
        const updated = await client.query<TransactionRow>(
          `UPDATE my_fin.credit_card_transaction
           SET current_installment = current_installment + 1
           WHERE id = $1
           RETURNING ${TRANSACTION_COLUMNS}`,
          [row.id],
        );
        updatedTransactions.push(toTransaction(updated.rows[0]));
      }
    }

    await client.query('COMMIT');
    return { paidCount: selected.rows.length, removedTransactionIds, updatedTransactions };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function toPaidTransaction(row: PaymentHistoryRow): PaidTransaction {
  return {
    ...toTransaction(row),
    sourceTransactionId: row.source_transaction_id,
    paymentMonth: row.payment_month,
  };
}

export async function findPaymentHistory(
  creditCardId: number,
  requestedPaymentMonth: string | null,
): Promise<PaymentHistory | undefined> {
  const latestResult = await pool.query<{ latest_payment_month: string | null }>(
    `SELECT to_char(MAX(payment.payment_month), 'YYYY-MM') AS latest_payment_month
     FROM my_fin.credit_card AS card
     LEFT JOIN my_fin.credit_card_payment AS payment ON payment.credit_card_id = card.id
     WHERE card.id = $1
     GROUP BY card.id`,
    [creditCardId],
  );
  const latestRow = latestResult.rows[0];
  if (!latestRow) return undefined;

  const latestPaymentMonth = latestRow.latest_payment_month;
  const paymentMonth = requestedPaymentMonth ?? latestPaymentMonth;

  if (!paymentMonth) {
    return { latestPaymentMonth, paymentMonth: null, transactions: [] };
  }

  const result = await pool.query<PaymentHistoryRow>(
    `SELECT ${PAYMENT_HISTORY_COLUMNS}
     FROM my_fin.credit_card_payment
     WHERE credit_card_id = $1 AND payment_month = $2::date
     ORDER BY transaction_date DESC, id DESC`,
    [creditCardId, `${paymentMonth}-01`],
  );

  return {
    latestPaymentMonth,
    paymentMonth,
    transactions: result.rows.map(toPaidTransaction),
  };
}