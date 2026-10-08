-- Up Migration

ALTER TABLE my_fin.account
  ADD COLUMN quantity NUMERIC(24, 10),
  ADD COLUMN unit_value NUMERIC(24, 10);

-- Down Migration

ALTER TABLE my_fin.account
  DROP COLUMN unit_value,
  DROP COLUMN quantity;
