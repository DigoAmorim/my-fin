-- Up Migration

CREATE TABLE my_fin.credit_card_transaction (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  credit_card_id INTEGER NOT NULL REFERENCES my_fin.credit_card(id) ON DELETE RESTRICT,
  installments BIGINT NOT NULL CHECK (installments > 0),
  installment_amount NUMERIC NOT NULL CHECK (
    installment_amount > 0 AND installment_amount = trunc(installment_amount, 2)
  ),
  debtor VARCHAR(20),
  transaction_type VARCHAR(20) NOT NULL CHECK (
    transaction_type IN ('main_card', 'purchase', 'credit')
  ),
  description VARCHAR(50),
  transaction_date DATE NOT NULL,
  purchase_type VARCHAR(20) NOT NULL CHECK (
    purchase_type IN ('first_fortnight', 'second_fortnight', 'installment_plan')
  ),
  CONSTRAINT credit_transaction_debtor_check CHECK (
    (debtor IS NULL OR char_length(btrim(debtor)) > 0)
    AND (transaction_type <> 'credit' OR debtor IS NOT NULL)
  ),
  CONSTRAINT credit_transaction_installment_mode_check CHECK (
    (purchase_type IN ('first_fortnight', 'second_fortnight') AND installments = 1)
    OR (purchase_type = 'installment_plan' AND installments > 1)
  )
);

CREATE INDEX credit_card_transaction_card_date_idx
  ON my_fin.credit_card_transaction (credit_card_id, transaction_date DESC);

-- Down Migration

DROP TABLE my_fin.credit_card_transaction;