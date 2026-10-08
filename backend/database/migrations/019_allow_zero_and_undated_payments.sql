-- Up Migration

ALTER TABLE my_fin.payment
  DROP CONSTRAINT payment_amount_check;

ALTER TABLE my_fin.payment
  ADD CONSTRAINT payment_amount_nonnegative_check
  CHECK (amount >= 0 AND amount = trunc(amount, 2));

ALTER TABLE my_fin.payment
  ALTER COLUMN payment_date DROP NOT NULL;

-- Down Migration

ALTER TABLE my_fin.payment
  DROP CONSTRAINT payment_amount_nonnegative_check;

ALTER TABLE my_fin.payment
  ADD CONSTRAINT payment_amount_check
  CHECK (amount > 0 AND amount = trunc(amount, 2));

ALTER TABLE my_fin.payment
  ALTER COLUMN payment_date SET NOT NULL;
