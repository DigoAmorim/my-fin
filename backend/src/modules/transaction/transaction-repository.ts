import { pool } from '../../../database/pool';
import type { Transaction, TransactionFields } from './transaction-types';

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
    SELECT id, credit_card_id, current_installment, total_installments, installment_amount, debtor,
           transaction_type, description, transaction_date::text, purchase_type
    FROM my_fin.credit_card_transaction
    ORDER BY transaction_date DESC, id DESC
  `);

  return result.rows.map(toTransaction);
}

export async function findById(id: number): Promise<Transaction | undefined> {
  const result = await pool.query<TransactionRow>(
    `SELECT id, credit_card_id, current_installment, total_installments, installment_amount, debtor,
            transaction_type, description, transaction_date::text, purchase_type
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
     RETURNING id, credit_card_id, current_installment, total_installments, installment_amount, debtor,
               transaction_type, description, transaction_date::text, purchase_type`,
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
    RETURNING id, credit_card_id, current_installment, total_installments, installment_amount, debtor,
               transaction_type, description, transaction_date::text, purchase_type`,
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