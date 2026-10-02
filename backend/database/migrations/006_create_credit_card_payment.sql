-- Up Migration

CREATE TABLE my_fin.credit_card_payment (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_transaction_id INTEGER NOT NULL,
  credit_card_id INTEGER NOT NULL REFERENCES my_fin.credit_card(id) ON DELETE RESTRICT,
  current_installment BIGINT NOT NULL CHECK (current_installment >= 1),
  total_installments BIGINT NOT NULL CHECK (total_installments >= current_installment),
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
    purchase_type IN ('first_fortnight', 'second_fortnight', 'installment_plan', 'recurring')
  ),
  payment_month DATE NOT NULL,
  CONSTRAINT credit_card_payment_debtor_check CHECK (
    (debtor IS NULL OR char_length(btrim(debtor)) > 0)
    AND (transaction_type <> 'credit' OR debtor IS NOT NULL)
  ),
  CONSTRAINT credit_card_payment_source_month_unique UNIQUE (source_transaction_id, payment_month)
);

CREATE INDEX credit_card_payment_card_month_idx
  ON my_fin.credit_card_payment (credit_card_id, payment_month DESC);

-- Down Migration

DROP TABLE my_fin.credit_card_payment;