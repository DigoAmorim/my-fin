-- Up Migration

ALTER TABLE my_fin.credit_card_transaction
  DROP CONSTRAINT credit_card_transaction_purchase_type_check;

ALTER TABLE my_fin.credit_card_transaction
  ADD CONSTRAINT credit_card_transaction_purchase_type_check CHECK (
    purchase_type IN ('first_fortnight', 'second_fortnight', 'installment_plan', 'recurring')
  );

ALTER TABLE my_fin.credit_card_transaction
  DROP CONSTRAINT credit_transaction_installment_mode_check;

ALTER TABLE my_fin.credit_card_transaction
  ADD CONSTRAINT credit_transaction_installment_mode_check CHECK (
    (purchase_type IN ('first_fortnight', 'second_fortnight', 'recurring') AND total_installments = 1)
    OR (purchase_type = 'installment_plan' AND total_installments > 0)
  );

-- Down Migration

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM my_fin.credit_card_transaction
    WHERE purchase_type = 'recurring'
  ) THEN
    RAISE EXCEPTION 'Cannot remove recurring purchase type while recurring transactions exist';
  END IF;
END
$$;

ALTER TABLE my_fin.credit_card_transaction
  DROP CONSTRAINT credit_transaction_installment_mode_check;

ALTER TABLE my_fin.credit_card_transaction
  ADD CONSTRAINT credit_transaction_installment_mode_check CHECK (
    (purchase_type IN ('first_fortnight', 'second_fortnight') AND total_installments = 1)
    OR (purchase_type = 'installment_plan' AND total_installments > 0)
  );

ALTER TABLE my_fin.credit_card_transaction
  DROP CONSTRAINT credit_card_transaction_purchase_type_check;

ALTER TABLE my_fin.credit_card_transaction
  ADD CONSTRAINT credit_card_transaction_purchase_type_check CHECK (
    purchase_type IN ('first_fortnight', 'second_fortnight', 'installment_plan')
  );