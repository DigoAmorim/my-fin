-- Up Migration

CREATE TABLE my_fin.payment (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL CHECK (char_length(btrim(name)) > 0),
  amount NUMERIC(14, 2) NOT NULL CHECK (
    amount > 0 AND amount = trunc(amount, 2)
  ),
  payment_date DATE NOT NULL,
  account_id INTEGER NOT NULL REFERENCES my_fin.account(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payment_date_idx ON my_fin.payment (payment_date, id);
CREATE INDEX payment_account_idx ON my_fin.payment (account_id);

-- Down Migration

DROP TABLE my_fin.payment;
