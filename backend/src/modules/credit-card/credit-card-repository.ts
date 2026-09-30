// Este modulo concentra o SQL e converte nomes do banco para o formato da API.
import { pool } from '../../../database/pool';
import type { CreditCard, CreditCardFields, CreateCreditCardInput } from './credit-card-types';

interface CreditCardRow {
  id: number;
  name: string;
  due_day: number;
}

function toCreditCard(row: CreditCardRow): CreditCard {
  return {
    id: row.id,
    name: row.name,
    dueDay: row.due_day,
  };
}

export async function findAll(): Promise<CreditCard[]> {
  const result = await pool.query<CreditCardRow>(`
    SELECT id, name, due_day
    FROM my_fin.credit_card
    ORDER BY id
  `);

  return result.rows.map(toCreditCard);
}

export async function findById(id: number): Promise<CreditCard | undefined> {
  const result = await pool.query<CreditCardRow>(
    `SELECT id, name, due_day FROM my_fin.credit_card WHERE id = $1`,
    [id],
  );

  const row = result.rows[0];
  return row ? toCreditCard(row) : undefined;
}

export async function create(input: CreateCreditCardInput): Promise<CreditCard> {
  const result = await pool.query<CreditCardRow>(
    `INSERT INTO my_fin.credit_card (name, due_day)
     VALUES ($1, $2)
     RETURNING id, name, due_day`,
    [input.name, input.dueDay],
  );

  return toCreditCard(result.rows[0]);
}

export async function update(id: number, fields: CreditCardFields): Promise<CreditCard | undefined> {
  const result = await pool.query<CreditCardRow>(
    `UPDATE my_fin.credit_card
     SET name = $2, due_day = $3
     WHERE id = $1
     RETURNING id, name, due_day`,
    [id, fields.name, fields.dueDay],
  );

  const row = result.rows[0];
  return row ? toCreditCard(row) : undefined;
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM my_fin.credit_card WHERE id = $1`,
    [id],
  );

  return result.rowCount === 1;
}