-- Up Migration

ALTER TABLE my_fin.account
  DROP CONSTRAINT account_source_pluggy_id;

ALTER TABLE my_fin.account
  DROP CONSTRAINT account_bank_pluggy_id_unique;

ALTER TABLE my_fin.account
  DROP COLUMN pluggy_account_id;

CREATE UNIQUE INDEX account_pluggy_bank_number_unique
  ON my_fin.account (bank_id, account_number)
  WHERE source = 'pluggy';

-- Down Migration

DROP INDEX my_fin.account_pluggy_bank_number_unique;

ALTER TABLE my_fin.account
  ADD COLUMN pluggy_account_id VARCHAR(100);

UPDATE my_fin.account
SET pluggy_account_id = account_number
WHERE source = 'pluggy';

ALTER TABLE my_fin.account
  ADD CONSTRAINT account_source_pluggy_id CHECK (
    (source = 'pluggy' AND pluggy_account_id IS NOT NULL)
    OR (source = 'manual' AND pluggy_account_id IS NULL)
  );

ALTER TABLE my_fin.account
  ADD CONSTRAINT account_bank_pluggy_id_unique
  UNIQUE (bank_id, pluggy_account_id);
