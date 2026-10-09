-- Up Migration

LOCK TABLE my_fin.account_yield IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM my_fin.account_yield
    GROUP BY account_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce one yield per account: duplicate account_yield.account_id rows exist. Resolve duplicates before applying this migration.';
  END IF;
END;
$$;

DROP INDEX my_fin.account_yield_account_created_idx;

ALTER TABLE my_fin.account_yield
  ADD CONSTRAINT account_yield_account_id_unique UNIQUE (account_id);

-- Down Migration

ALTER TABLE my_fin.account_yield
  DROP CONSTRAINT account_yield_account_id_unique;

CREATE INDEX account_yield_account_created_idx
  ON my_fin.account_yield (account_id, created_at DESC, id DESC);
