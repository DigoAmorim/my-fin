import { pool } from '../../../database/pool';
import type { SnapshotEvolutionPoint } from './snapshot-types';

type SnapshotEvolutionRow = {
  month: string;
  amount: string;
};

export async function findPortfolioEvolution(): Promise<SnapshotEvolutionPoint[]> {
  const result = await pool.query<SnapshotEvolutionRow>(
    `WITH current_period AS (
       SELECT date_trunc('month', CURRENT_DATE)::date AS month
     ),
     recent_months AS (
       SELECT DISTINCT snapshot.snapshot_month AS month
       FROM my_fin.account_snapshot AS snapshot
       CROSS JOIN current_period
       WHERE snapshot.snapshot_month < current_period.month
       ORDER BY month DESC
       LIMIT 11
     ),
     monthly_snapshots AS (
       SELECT snapshot.snapshot_month AS month, SUM(snapshot.amount) AS amount
       FROM recent_months
       JOIN my_fin.account_snapshot AS snapshot
         ON snapshot.snapshot_month = recent_months.month
       GROUP BY snapshot.snapshot_month
     ),
     monthly_totals AS (
       SELECT month, amount
       FROM monthly_snapshots
       UNION ALL
       SELECT current_period.month, COALESCE(SUM(account.balance), 0)
       FROM current_period
       LEFT JOIN my_fin.account AS account ON TRUE
       GROUP BY current_period.month
     )
     SELECT to_char(monthly_totals.month, 'YYYY-MM') AS month,
       monthly_totals.amount::text AS amount
     FROM monthly_totals
     ORDER BY monthly_totals.month`,
  );
  return result.rows;
}
