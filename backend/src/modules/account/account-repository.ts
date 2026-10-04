import { pool } from '../../../database/pool';
import type { Account, AccountFields } from './account-types';

interface AccountRow {
  id: number;
  name: string;
  bank_name: string;
  pluggy_item_id: string | null;
  current_balance: string;
  balance_updated_at: Date;
}

const ACCOUNT_COLUMNS = 'id, name, bank_name, pluggy_item_id, current_balance, balance_updated_at';

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    bankName: row.bank_name,
    pluggyItemId: row.pluggy_item_id,
    currentBalance: row.current_balance,
    balanceUpdatedAt: row.balance_updated_at.toISOString(),
  };
}

export async function findAll(): Promise<Account[]> {
  const result = await pool.query<AccountRow>(
    `SELECT ${ACCOUNT_COLUMNS}
     FROM my_fin.account
     ORDER BY name, id`,
  );

  return result.rows.map(toAccount);
}

export async function create(fields: AccountFields): Promise<Account> {
  const result = await pool.query<AccountRow>(
    `INSERT INTO my_fin.account (name, bank_name, pluggy_item_id, current_balance)
     VALUES ($1, $2, $3, $4)
     RETURNING ${ACCOUNT_COLUMNS}`,
    [fields.name, fields.bankName, fields.pluggyItemId, fields.currentBalance],
  );

  return toAccount(result.rows[0]);
}

export async function update(id: number, fields: AccountFields): Promise<Account | undefined> {
  const result = await pool.query<AccountRow>(
    `UPDATE my_fin.account
     SET name = $2,
         bank_name = $3,
         pluggy_item_id = $4,
         -- The timestamp represents the balance refresh, not unrelated metadata edits.
         balance_updated_at = CASE
           WHEN current_balance IS DISTINCT FROM $5::numeric THEN NOW()
           ELSE balance_updated_at
         END,
         current_balance = $5
     WHERE id = $1
     RETURNING ${ACCOUNT_COLUMNS}`,
    [id, fields.name, fields.bankName, fields.pluggyItemId, fields.currentBalance],
  );

  const row = result.rows[0];
  return row ? toAccount(row) : undefined;
}

export async function updateBalance(
  id: number,
  balance: string,
  updatedAt: string,
): Promise<Account | undefined> {
  const result = await pool.query<AccountRow>(
    `UPDATE my_fin.account
     SET current_balance = $2,
         balance_updated_at = $3::timestamptz
     WHERE id = $1
     RETURNING ${ACCOUNT_COLUMNS}`,
    [id, balance, updatedAt],
  );

  const row = result.rows[0];
  return row ? toAccount(row) : undefined;
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM my_fin.account WHERE id = $1', [id]);
  return result.rowCount === 1;
}
