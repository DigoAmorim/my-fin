// Este modulo concentra o SQL e converte nomes do banco para o formato da API.
import { pool } from '../../../database/pool';
import type { CreditCard, CreditCardFields } from './types';

interface CreditCardRow {
  code: string;
  name: string;
  due_day: number;
}

function toCreditCard(row: CreditCardRow): CreditCard {
  return {
    code: row.code,
    name: row.name,
    dueDay: row.due_day,
  };
}

export async function findAll(): Promise<CreditCard[]> {
  const result = await pool.query<CreditCardRow>(`
    SELECT code, name, due_day
    FROM my_fin.credit_card
    ORDER BY code
  `);

  return result.rows.map(toCreditCard);
}

export async function findByCode(code: string): Promise<CreditCard | undefined> {
  const result = await pool.query<CreditCardRow>(
    `SELECT code, name, due_day FROM my_fin.credit_card WHERE code = $1`,
    [code],
  );

  const row = result.rows[0];
  return row ? toCreditCard(row) : undefined;
}

export async function create(input: CreditCard): Promise<CreditCard> {
  const result = await pool.query<CreditCardRow>(
    `INSERT INTO my_fin.credit_card (code, name, due_day)
     VALUES ($1, $2, $3)
     RETURNING code, name, due_day`,
    [input.code, input.name, input.dueDay],
  );

  return toCreditCard(result.rows[0]);
}

export async function update(code: string, fields: CreditCardFields): Promise<CreditCard | undefined> {
  const result = await pool.query<CreditCardRow>(
    `UPDATE my_fin.credit_card
     SET name = $2, due_day = $3
     WHERE code = $1
     RETURNING code, name, due_day`,
    [code, fields.name, fields.dueDay],
  );

  const row = result.rows[0];
  return row ? toCreditCard(row) : undefined;
}

export async function remove(code: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM my_fin.credit_card WHERE code = $1`,
    [code],
  );

  return result.rowCount === 1;
}