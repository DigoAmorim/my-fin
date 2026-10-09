import { withTransaction } from '../../../database/transaction';
import { pool } from '../../../database/pool';
import type { FixedIncomePosition, PluggyFixedIncomePosition } from './fixed-income-types';

type FixedIncomeRow = {
  id: number;
  bank_id: number;
  bank_name: string;
  account_number: string;
  balance: string;
  updated_at: Date;
  source: FixedIncomePosition['source'];
};

const FIXED_INCOME_COLUMNS = `
  id, bank_id, bank_name, account_number, balance, updated_at, source
`;

function toFixedIncomePosition(row: FixedIncomeRow): FixedIncomePosition {
  return {
    id: row.id,
    bankId: row.bank_id,
    bankName: row.bank_name,
    subtype: row.account_number,
    amount: row.balance,
    updatedAt: row.updated_at.toISOString(),
    source: row.source,
  };
}

export async function findAllFixedIncome(): Promise<FixedIncomePosition[]> {
  const result = await pool.query<FixedIncomeRow>(
    `SELECT ${FIXED_INCOME_COLUMNS}
     FROM my_fin.account
     WHERE account_type = 'fixed_income'
       AND source IN ('manual', 'pluggy_investment')
     ORDER BY bank_name, account_number, id`,
  );

  return result.rows.map(toFixedIncomePosition);
}

export async function upsertFixedIncome(
  batches: Array<{ bank: { id: number; bankName: string }; positions: PluggyFixedIncomePosition[] }>,
): Promise<number> {
  await withTransaction(async (client) => {
    for (const { bank, positions } of batches) {
      for (const position of positions) {
        await client.query(
          `INSERT INTO my_fin.account (
             bank_id, bank_name, account_number, account_type, balance, updated_at,
             source, pluggy_investment_id
           )
           VALUES ($1, $2, $3, 'fixed_income', $4, $5, 'pluggy_investment', $6)
           ON CONFLICT (bank_id, pluggy_investment_id)
           WHERE source = 'pluggy_investment'
           DO UPDATE SET
             bank_name = EXCLUDED.bank_name,
             account_number = EXCLUDED.account_number,
             balance = EXCLUDED.balance,
             updated_at = EXCLUDED.updated_at`,
          [bank.id, bank.bankName, position.subtype, position.amount, position.updatedAt, position.id],
        );
      }
      await client.query(
        `DELETE FROM my_fin.account
         WHERE bank_id = $1
           AND source = 'pluggy_investment'
           AND account_type = 'fixed_income'
           AND NOT (pluggy_investment_id = ANY($2::varchar[]))`,
        [bank.id, positions.map((position) => position.id)],
      );
    }
  });

  return batches.reduce((total, batch) => total + batch.positions.length, 0);
}

export async function removeFixedIncomePosition(id: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM my_fin.account
     WHERE id = $1 AND source = 'pluggy_investment'`,
    [id],
  );
  return result.rowCount === 1;
}