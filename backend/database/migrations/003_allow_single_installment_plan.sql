-- Up Migration

ALTER TABLE my_fin.credit_card_transaction
  DROP CONSTRAINT credit_transaction_installment_mode_check;

ALTER TABLE my_fin.credit_card_transaction
  ADD CONSTRAINT credit_transaction_installment_mode_check CHECK (
    (purchase_type IN ('first_fortnight', 'second_fortnight') AND installments = 1)
    OR (purchase_type = 'installment_plan' AND installments > 0)
  );

-- Down Migration

ALTER TABLE my_fin.credit_card_transaction
  DROP CONSTRAINT credit_transaction_installment_mode_check;

ALTER TABLE my_fin.credit_card_transaction
  ADD CONSTRAINT credit_transaction_installment_mode_check CHECK (
    (purchase_type IN ('first_fortnight', 'second_fortnight') AND installments = 1)
    OR (purchase_type = 'installment_plan' AND installments > 1)
  );