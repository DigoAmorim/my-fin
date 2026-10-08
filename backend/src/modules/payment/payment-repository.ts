import { pool } from '../../../database/pool';
import type { Payment, PaymentFields } from './payment-types';

type PaymentRow = {
  id: number;
  name: string;
  amount: string;
  payment_date: string | null;
  account_id: number;
  bank_name: string;
  account_number: string;
};

const PAYMENT_COLUMNS = `
  payment.id, payment.name, payment.amount,
  payment.payment_date::text AS payment_date,
  payment.account_id, account.bank_name, account.account_number
`;

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    date: row.payment_date,
    accountId: row.account_id,
    bankName: row.bank_name,
    accountNumber: row.account_number,
  };
}

export async function findAll(): Promise<Payment[]> {
  const result = await pool.query<PaymentRow>(
    `SELECT ${PAYMENT_COLUMNS}
     FROM my_fin.payment AS payment
     JOIN my_fin.account AS account ON account.id = payment.account_id
     ORDER BY payment.payment_date NULLS LAST, payment.name, payment.id`,
  );
  return result.rows.map(toPayment);
}

export async function accountIsEligible(accountId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1
     FROM my_fin.account
     WHERE id = $1 AND account_type IN ('checking', 'savings')`,
    [accountId],
  );
  return result.rowCount === 1;
}

export async function create(fields: PaymentFields): Promise<Payment> {
  const result = await pool.query<PaymentRow>(
    `INSERT INTO my_fin.payment (name, amount, payment_date, account_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, amount, payment_date::text AS payment_date, account_id,
       (SELECT bank_name FROM my_fin.account WHERE id = account_id) AS bank_name,
       (SELECT account_number FROM my_fin.account WHERE id = account_id) AS account_number`,
    [fields.name, fields.amount, fields.date, fields.accountId],
  );
  return toPayment(result.rows[0]);
}

export async function update(id: number, fields: PaymentFields): Promise<Payment | undefined> {
  const result = await pool.query<PaymentRow>(
    `UPDATE my_fin.payment AS payment
     SET name = $2, amount = $3, payment_date = $4, account_id = $5
     WHERE payment.id = $1
     RETURNING payment.id, payment.name, payment.amount,
       payment.payment_date::text AS payment_date, payment.account_id,
       (SELECT bank_name FROM my_fin.account WHERE id = payment.account_id) AS bank_name,
       (SELECT account_number FROM my_fin.account WHERE id = payment.account_id) AS account_number`,
    [id, fields.name, fields.amount, fields.date, fields.accountId],
  );
  return result.rows[0] ? toPayment(result.rows[0]) : undefined;
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM my_fin.payment WHERE id = $1', [id]);
  return result.rowCount === 1;
}
