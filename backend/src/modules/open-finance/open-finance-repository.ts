import { pool } from '../../../database/pool';
import type { OpenFinanceBank, OpenFinanceBankFields } from './open-finance-types';

interface OpenFinanceBankRow {
  id: number;
  bank_name: string;
  checking_account: boolean;
  savings_account: boolean;
  fixed_income: boolean;
  variable_income: boolean;
  pluggy_item_id: string;
}

const OPEN_FINANCE_BANK_COLUMNS = `
  id, bank_name, checking_account, savings_account, fixed_income, variable_income, pluggy_item_id
`;

function toOpenFinanceBank(row: OpenFinanceBankRow): OpenFinanceBank {
  return {
    id: row.id,
    bankName: row.bank_name,
    checkingAccount: row.checking_account,
    savingsAccount: row.savings_account,
    fixedIncome: row.fixed_income,
    variableIncome: row.variable_income,
    pluggyItemId: row.pluggy_item_id,
  };
}

export async function findAll(): Promise<OpenFinanceBank[]> {
  const result = await pool.query<OpenFinanceBankRow>(
    `SELECT ${OPEN_FINANCE_BANK_COLUMNS}
     FROM my_fin.bank
     ORDER BY bank_name, id`,
  );

  return result.rows.map(toOpenFinanceBank);
}

export async function create(fields: OpenFinanceBankFields): Promise<OpenFinanceBank> {
  const result = await pool.query<OpenFinanceBankRow>(
    `INSERT INTO my_fin.bank (
       bank_name, checking_account, savings_account, fixed_income, variable_income, pluggy_item_id
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${OPEN_FINANCE_BANK_COLUMNS}`,
    [
      fields.bankName,
      fields.checkingAccount,
      fields.savingsAccount,
      fields.fixedIncome,
      fields.variableIncome,
      fields.pluggyItemId,
    ],
  );

  return toOpenFinanceBank(result.rows[0]);
}

export async function update(
  id: number,
  fields: OpenFinanceBankFields,
): Promise<OpenFinanceBank | undefined> {
  const result = await pool.query<OpenFinanceBankRow>(
    `UPDATE my_fin.bank
     SET bank_name = $2,
         checking_account = $3,
         savings_account = $4,
         fixed_income = $5,
         variable_income = $6,
         pluggy_item_id = $7
     WHERE id = $1
     RETURNING ${OPEN_FINANCE_BANK_COLUMNS}`,
    [
      id,
      fields.bankName,
      fields.checkingAccount,
      fields.savingsAccount,
      fields.fixedIncome,
      fields.variableIncome,
      fields.pluggyItemId,
    ],
  );

  const row = result.rows[0];
  return row ? toOpenFinanceBank(row) : undefined;
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM my_fin.bank WHERE id = $1', [id]);
  return result.rowCount === 1;
}
