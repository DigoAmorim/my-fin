import { pool } from '../../../database/pool';
import type { PluggyVariableIncomePosition, VariableIncomePosition } from './variable-income-types';

type VariableIncomeRow = {
  id: number;
  bank_name: string;
  quantity: string;
  unit_value: string;
  balance: string;
  updated_at: Date;
};

export async function findAll(): Promise<VariableIncomePosition[]> {
  const result = await pool.query<VariableIncomeRow>(
    `SELECT id, bank_name, quantity, unit_value, balance, updated_at
     FROM my_fin.account
     WHERE account_type = 'EQUITY'
     ORDER BY bank_name, account_number, id`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    assetName: row.bank_name,
    quantity: row.quantity,
    unitValue: row.unit_value,
    amount: row.balance,
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function upsert(
  batches: Array<{
    bank: { id: number };
    positions: PluggyVariableIncomePosition[];
  }>,
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { bank, positions } of batches) {
      for (const position of positions) {
        await client.query(
          `INSERT INTO my_fin.account (
             bank_id, bank_name, account_number, account_type, balance, updated_at,
             source, pluggy_investment_id, quantity, unit_value
           )
           VALUES ($1, $2, $3, $4, $5, $6, 'pluggy_investment', $7, $8, $9)
           ON CONFLICT (bank_id, pluggy_investment_id)
           WHERE source = 'pluggy_investment'
           DO UPDATE SET
             bank_name = EXCLUDED.bank_name,
             account_number = EXCLUDED.account_number,
             account_type = EXCLUDED.account_type,
             balance = EXCLUDED.balance,
             updated_at = EXCLUDED.updated_at,
             quantity = EXCLUDED.quantity,
             unit_value = EXCLUDED.unit_value`,
          [
            bank.id,
            position.assetName,
            position.type,
            position.type,
            position.amount,
            position.updatedAt,
            position.id,
            position.quantity,
            position.unitValue,
          ],
        );
      }
      await client.query(
        `DELETE FROM my_fin.account
         WHERE bank_id = $1
           AND source = 'pluggy_investment'
           AND account_type = 'EQUITY'
           AND NOT (pluggy_investment_id = ANY($2::varchar[]))`,
        [bank.id, positions.map((position) => position.id)],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return batches.reduce((total, batch) => total + batch.positions.length, 0);
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM my_fin.account
     WHERE id = $1
       AND account_type = 'EQUITY'
       AND source = 'pluggy_investment'`,
    [id],
  );
  return result.rowCount === 1;
}
