-- Up Migration

DROP TABLE IF EXISTS my_fin.hidden_investment;

ALTER TABLE my_fin.account
  DROP CONSTRAINT IF EXISTS account_account_type_check;

ALTER TABLE my_fin.account
  DROP CONSTRAINT IF EXISTS account_source_check;

ALTER TABLE my_fin.account
  ADD COLUMN pluggy_investment_id VARCHAR(100);

ALTER TABLE my_fin.account
  ADD CONSTRAINT account_source_check
  CHECK (source IN ('manual', 'pluggy', 'pluggy_investment'));

ALTER TABLE my_fin.account
  ADD CONSTRAINT account_pluggy_investment_id_check
  CHECK (
    (source = 'pluggy_investment' AND pluggy_investment_id IS NOT NULL)
    OR (source <> 'pluggy_investment' AND pluggy_investment_id IS NULL)
  );

CREATE UNIQUE INDEX account_pluggy_investment_unique
  ON my_fin.account (bank_id, pluggy_investment_id)
  WHERE source = 'pluggy_investment';

-- Down Migration

DROP INDEX my_fin.account_pluggy_investment_unique;

ALTER TABLE my_fin.account
  DROP CONSTRAINT account_pluggy_investment_id_check;

ALTER TABLE my_fin.account
  DROP CONSTRAINT account_source_check;

ALTER TABLE my_fin.account
  DROP COLUMN pluggy_investment_id;

ALTER TABLE my_fin.account
  ADD CONSTRAINT account_source_check
  CHECK (source IN ('manual', 'pluggy'));

ALTER TABLE my_fin.account
  ADD CONSTRAINT account_account_type_check
  CHECK (account_type IN ('checking', 'savings', 'fixed_income'));