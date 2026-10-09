import { pool } from '../../../database/pool';
import type { AccountYield, CreateYieldFields, UpdateYieldFields } from './yield-types';

type AccountYieldRow = {
  id: number;
  account_id: number;
  bank_name: string;
  account_number: string;
  account_type: AccountYield['accountType'];
  previous_balance: string;
  current_balance: string;
  yield_amount: string;
  is_automatic: boolean;
  created_at: Date;
};

const YIELD_COLUMNS = `
  yield_record.id, yield_record.account_id, account.bank_name,
  account.account_number, account.account_type,
  COALESCE(snapshot.amount, 0)::text AS previous_balance,
  account.balance AS current_balance, yield_record.yield_amount,
  yield_record.is_automatic, yield_record.created_at
`;

function latestSnapshotJoin(accountIdExpression: string): string {
  return `
  LEFT JOIN LATERAL (
    SELECT account_snapshot.amount
    FROM my_fin.account_snapshot AS account_snapshot
    WHERE account_snapshot.account_id = ${accountIdExpression}
      AND account_snapshot.snapshot_month < date_trunc('month', CURRENT_DATE)::date
    ORDER BY account_snapshot.snapshot_month DESC
    LIMIT 1
  ) AS snapshot ON TRUE
`;
}

const PREVIOUS_SNAPSHOT = latestSnapshotJoin('yield_record.account_id');
const ACCOUNT_PREVIOUS_SNAPSHOT = latestSnapshotJoin('account.id');

export class DuplicateAccountYieldError extends Error {
  constructor() {
    super('An account can only have one yield record.');
    this.name = 'DuplicateAccountYieldError';
  }
}

function isDuplicateAccountYieldError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === '23505'
    && 'constraint' in error
    && error.constraint === 'account_yield_account_id_unique';
}

function toAccountYield(row: AccountYieldRow): AccountYield {
  return {
    id: row.id,
    accountId: row.account_id,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountType: row.account_type,
    previousBalance: row.previous_balance,
    currentBalance: row.current_balance,
    amount: row.yield_amount,
    isAutomatic: row.is_automatic,
    createdAt: row.created_at.toISOString(),
  };
}

export async function findAll(): Promise<AccountYield[]> {
  const result = await pool.query<AccountYieldRow>(
    `SELECT ${YIELD_COLUMNS}
     FROM my_fin.account_yield AS yield_record
     JOIN my_fin.account AS account ON account.id = yield_record.account_id
     ${PREVIOUS_SNAPSHOT}
     ORDER BY yield_record.created_at DESC, yield_record.id DESC`,
  );
  return result.rows.map(toAccountYield);
}

export async function create(fields: CreateYieldFields): Promise<AccountYield | undefined> {
  try {
    const result = await pool.query<AccountYieldRow>(
      `WITH created AS (
       INSERT INTO my_fin.account_yield (
        account_id, yield_amount, is_automatic
       )
      SELECT account.id,
        CASE WHEN $2 THEN account.balance - COALESCE(snapshot.amount, 0) ELSE 0 END,
        $2
      FROM my_fin.account AS account
      ${ACCOUNT_PREVIOUS_SNAPSHOT}
      WHERE account.id = $1
        AND account.account_type IN ('checking', 'savings', 'fixed_income')
      RETURNING *
    )
    SELECT ${YIELD_COLUMNS.replaceAll('yield_record.', 'created.')}
    FROM created
    JOIN my_fin.account AS account ON account.id = created.account_id
    ${PREVIOUS_SNAPSHOT.replaceAll('yield_record.', 'created.')}`,
      [fields.accountId, fields.isAutomatic],
    );
    return result.rows[0] ? toAccountYield(result.rows[0]) : undefined;
  } catch (error) {
    if (isDuplicateAccountYieldError(error)) throw new DuplicateAccountYieldError();
    throw error;
  }
}

export async function update(
  id: number,
  fields: UpdateYieldFields,
): Promise<AccountYield | undefined> {
  const result = await pool.query<AccountYieldRow>(
    `WITH updated AS (
       UPDATE my_fin.account_yield AS yield_record
       SET is_automatic = $2,
           yield_amount = CASE
             WHEN $2 THEN account.balance - COALESCE(snapshot.amount, 0)
               ELSE $3
             END
      FROM my_fin.account AS account
      ${ACCOUNT_PREVIOUS_SNAPSHOT}
      WHERE yield_record.id = $1
        AND account.id = yield_record.account_id
      RETURNING *
    )
    SELECT ${YIELD_COLUMNS.replaceAll('yield_record.', 'updated.')}
    FROM updated
    JOIN my_fin.account AS account ON account.id = updated.account_id
    ${PREVIOUS_SNAPSHOT.replaceAll('yield_record.', 'updated.')}`,
    [id, fields.isAutomatic, fields.amount],
  );
  return result.rows[0] ? toAccountYield(result.rows[0]) : undefined;
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM my_fin.account_yield WHERE id = $1', [id]);
  return result.rowCount === 1;
}
