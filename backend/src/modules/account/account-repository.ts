import { pool } from '../../../database/pool';
import type { Account, AccountFields, AccountType, PluggyAccount } from './account-types';

interface AccountRow {
  id: number;
  bank_id: number | null;
  bank_name: string;
  account_number: string;
  account_type: AccountType;
  balance: string;
  updated_at: Date;
  source: Account['source'];
}

export interface OpenFinanceBankRow {
  id: number;
  bank_name: string;
  checking_account: boolean;
  savings_account: boolean;
  fixed_income: boolean;
  pluggy_item_id: string;
}

const ACCOUNT_COLUMNS = `
  id, bank_id, bank_name, account_number, account_type, balance, updated_at, source
`;

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    bankId: row.bank_id,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountType: row.account_type,
    balance: row.balance,
    updatedAt: row.updated_at.toISOString(),
    source: row.source,
  };
}

export async function findAll(accountType?: AccountType): Promise<Account[]> {
  const query = accountType
    ? `SELECT ${ACCOUNT_COLUMNS}
       FROM my_fin.account
       WHERE account_type = $1
       ORDER BY bank_name, account_type, account_number, id`
    : `SELECT ${ACCOUNT_COLUMNS}
       FROM my_fin.account
       ORDER BY bank_name, account_type, account_number, id`;
  const result = await pool.query<AccountRow>(query, accountType ? [accountType] : []);

  return result.rows.map(toAccount);
}

export async function findById(id: number): Promise<Account | undefined> {
  const result = await pool.query<AccountRow>(
    `SELECT ${ACCOUNT_COLUMNS}
     FROM my_fin.account
     WHERE id = $1`,
    [id],
  );

  return result.rows[0] ? toAccount(result.rows[0]) : undefined;
}

export async function createManual(fields: AccountFields): Promise<Account> {
  const result = await pool.query<AccountRow>(
    `INSERT INTO my_fin.account (
       bank_id, bank_name, account_number, account_type, balance, updated_at, source
     )
     VALUES (
       (SELECT MIN(id)
        FROM my_fin.bank
        WHERE LOWER(TRIM(bank_name)) = LOWER(TRIM($1))
        HAVING COUNT(*) = 1),
       $1, $2, $3, $4, $5, 'manual'
     )
     RETURNING ${ACCOUNT_COLUMNS}`,
    [fields.bankName, fields.accountNumber, fields.accountType, fields.balance, fields.updatedAt],
  );

  return toAccount(result.rows[0]);
}

export async function updateManual(id: number, fields: AccountFields): Promise<Account | undefined> {
  const result = await pool.query<AccountRow>(
    `UPDATE my_fin.account AS account
     SET bank_id = (
           SELECT MIN(bank.id)
           FROM my_fin.bank AS bank
           WHERE LOWER(TRIM(bank.bank_name)) = LOWER(TRIM($2))
           HAVING COUNT(*) = 1
         ),
         bank_name = $2,
         account_number = $3,
         account_type = $4,
         balance = $5,
         updated_at = $6
     WHERE account.id = $1 AND account.source = 'manual'
     RETURNING ${ACCOUNT_COLUMNS}`,
    [id, fields.bankName, fields.accountNumber, fields.accountType, fields.balance, fields.updatedAt],
  );

  return result.rows[0] ? toAccount(result.rows[0]) : undefined;
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM my_fin.account WHERE id = $1', [id]);
  return result.rowCount === 1;
}

export async function findForSynchronization(): Promise<OpenFinanceBankRow[]> {
  const result = await pool.query<OpenFinanceBankRow>(
    `SELECT id, bank_name, checking_account, savings_account, fixed_income, pluggy_item_id
     FROM my_fin.bank
     WHERE checking_account OR savings_account OR fixed_income
     ORDER BY id`,
  );

  return result.rows;
}

export async function upsertPluggyAccounts(
  batches: Array<{ bank: OpenFinanceBankRow; accounts: PluggyAccount[] }>,
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { bank, accounts } of batches) {
      for (const account of accounts) {
        await client.query(
          `INSERT INTO my_fin.account (
             bank_id, bank_name, account_number, account_type, balance, updated_at, source
           )
           VALUES ($1, $2, $3, $4, $5, $6, 'pluggy')
           ON CONFLICT (bank_id, account_number)
           WHERE source = 'pluggy'
           DO UPDATE SET
             balance = EXCLUDED.balance,
             updated_at = EXCLUDED.updated_at`,
          [
            bank.id,
            bank.bank_name,
            account.number,
            account.subtype,
            account.balance,
            account.updatedAt,
          ],
        );
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return batches.reduce((total, batch) => total + batch.accounts.length, 0);
}
