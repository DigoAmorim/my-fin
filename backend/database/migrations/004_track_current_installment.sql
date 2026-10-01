-- Up Migration

ALTER TABLE my_fin.credit_card_transaction
  RENAME COLUMN installments TO total_installments;

ALTER TABLE my_fin.credit_card_transaction
  ADD COLUMN current_installment BIGINT NOT NULL DEFAULT 1;

ALTER TABLE my_fin.credit_card_transaction
  ADD CONSTRAINT credit_transaction_installment_position_check CHECK (
    current_installment >= 1 AND current_installment <= total_installments
  );

-- Down Migration

ALTER TABLE my_fin.credit_card_transaction
  DROP CONSTRAINT credit_transaction_installment_position_check;

ALTER TABLE my_fin.credit_card_transaction
  DROP COLUMN current_installment;

ALTER TABLE my_fin.credit_card_transaction
  RENAME COLUMN total_installments TO installments;