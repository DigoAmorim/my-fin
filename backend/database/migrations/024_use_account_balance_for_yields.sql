-- Up Migration

DROP TRIGGER IF EXISTS account_balance_refresh_automatic_yields ON my_fin.account;
DROP FUNCTION IF EXISTS my_fin.refresh_automatic_account_yields();

ALTER TABLE my_fin.account_yield
  DROP CONSTRAINT IF EXISTS account_yield_current_balance_scale,
  DROP COLUMN IF EXISTS current_balance;

UPDATE my_fin.account_yield AS yield_record
SET yield_amount = account.balance - COALESCE((
  SELECT snapshot.amount
  FROM my_fin.account_snapshot AS snapshot
  WHERE snapshot.account_id = account.id
    AND snapshot.snapshot_month < date_trunc('month', CURRENT_DATE)::date
  ORDER BY snapshot.snapshot_month DESC
  LIMIT 1
), 0)
FROM my_fin.account AS account
WHERE account.id = yield_record.account_id
  AND yield_record.is_automatic;

CREATE FUNCTION my_fin.refresh_automatic_account_yields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE my_fin.account_yield AS yield_record
  SET yield_amount = NEW.balance - COALESCE((
        SELECT snapshot.amount
        FROM my_fin.account_snapshot AS snapshot
        WHERE snapshot.account_id = NEW.id
          AND snapshot.snapshot_month < date_trunc('month', CURRENT_DATE)::date
        ORDER BY snapshot.snapshot_month DESC
        LIMIT 1
      ), 0)
  WHERE yield_record.account_id = NEW.id
    AND yield_record.is_automatic;

  RETURN NEW;
END;
$$;

CREATE TRIGGER account_balance_refresh_automatic_yields
AFTER UPDATE OF balance ON my_fin.account
FOR EACH ROW
WHEN (OLD.balance IS DISTINCT FROM NEW.balance)
EXECUTE FUNCTION my_fin.refresh_automatic_account_yields();

-- Down Migration

DROP TRIGGER account_balance_refresh_automatic_yields ON my_fin.account;
DROP FUNCTION my_fin.refresh_automatic_account_yields();

ALTER TABLE my_fin.account_yield
  ADD COLUMN current_balance NUMERIC(14, 2);

UPDATE my_fin.account_yield AS yield_record
SET current_balance = account.balance
FROM my_fin.account AS account
WHERE account.id = yield_record.account_id;

ALTER TABLE my_fin.account_yield
  ALTER COLUMN current_balance SET NOT NULL;

ALTER TABLE my_fin.account_yield
  ADD CONSTRAINT account_yield_current_balance_scale CHECK (
    current_balance = trunc(current_balance, 2)
  );
