-- Up Migration

ALTER TABLE my_fin.account
  DROP CONSTRAINT IF EXISTS account_account_type_check;

-- Down Migration

ALTER TABLE my_fin.account
  ADD CONSTRAINT account_account_type_check
  CHECK (account_type IN ('checking', 'savings'));