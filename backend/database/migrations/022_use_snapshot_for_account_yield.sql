-- Up Migration

UPDATE my_fin.account_yield AS account_yield
SET yield_amount = account_yield.current_balance - COALESCE((
  SELECT snapshot.amount
  FROM my_fin.account_snapshot AS snapshot
  WHERE snapshot.account_id = account_yield.account_id
    AND snapshot.snapshot_month < date_trunc('month', CURRENT_DATE)::date
  ORDER BY snapshot.snapshot_month DESC
  LIMIT 1
), 0)
WHERE account_yield.is_automatic;

ALTER TABLE my_fin.account_yield
  DROP CONSTRAINT account_yield_previous_balance_scale,
  DROP COLUMN previous_balance;

-- Down Migration

ALTER TABLE my_fin.account_yield
  ADD COLUMN previous_balance NUMERIC(14, 2) NOT NULL DEFAULT 0;

UPDATE my_fin.account_yield AS account_yield
SET previous_balance = COALESCE((
  SELECT snapshot.amount
  FROM my_fin.account_snapshot AS snapshot
  WHERE snapshot.account_id = account_yield.account_id
    AND snapshot.snapshot_month < date_trunc('month', CURRENT_DATE)::date
  ORDER BY snapshot.snapshot_month DESC
  LIMIT 1
), 0);

ALTER TABLE my_fin.account_yield
  ADD CONSTRAINT account_yield_previous_balance_scale CHECK (
    previous_balance = trunc(previous_balance, 2)
  );
