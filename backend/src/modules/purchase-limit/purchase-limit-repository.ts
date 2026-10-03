import { pool } from '../../../database/pool';
import type { PurchaseLimit, PurchaseLimitFields } from './purchase-limit-types';

interface PurchaseLimitRow {
  id: number;
  purchase_type: PurchaseLimit['purchaseType'];
  amount: string;
}

function toPurchaseLimit(row: PurchaseLimitRow): PurchaseLimit {
  return {
    id: row.id,
    purchaseType: row.purchase_type,
    amount: row.amount,
  };
}

const PURCHASE_LIMIT_COLUMNS = 'id, purchase_type, amount';

export async function findAll(): Promise<PurchaseLimit[]> {
  const result = await pool.query<PurchaseLimitRow>(
    `SELECT ${PURCHASE_LIMIT_COLUMNS}
     FROM my_fin.purchase_limit
     ORDER BY purchase_type`,
  );

  return result.rows.map(toPurchaseLimit);
}

export async function create(fields: PurchaseLimitFields): Promise<PurchaseLimit> {
  const result = await pool.query<PurchaseLimitRow>(
    `INSERT INTO my_fin.purchase_limit (purchase_type, amount)
     VALUES ($1, $2)
     RETURNING ${PURCHASE_LIMIT_COLUMNS}`,
    [fields.purchaseType, fields.amount],
  );

  return toPurchaseLimit(result.rows[0]);
}

export async function update(
  id: number,
  fields: PurchaseLimitFields,
): Promise<PurchaseLimit | undefined> {
  const result = await pool.query<PurchaseLimitRow>(
    `UPDATE my_fin.purchase_limit
     SET purchase_type = $2, amount = $3
     WHERE id = $1
     RETURNING ${PURCHASE_LIMIT_COLUMNS}`,
    [id, fields.purchaseType, fields.amount],
  );

  const row = result.rows[0];
  return row ? toPurchaseLimit(row) : undefined;
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM my_fin.purchase_limit WHERE id = $1',
    [id],
  );

  return result.rowCount === 1;
}
