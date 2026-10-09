-- Up Migration

CREATE TABLE my_fin.account_yield (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES my_fin.account(id) ON DELETE RESTRICT,
  previous_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(14, 2) NOT NULL,
  yield_amount NUMERIC(14, 2) NOT NULL,
  is_automatic BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT account_yield_previous_balance_scale CHECK (
    previous_balance = trunc(previous_balance, 2)
  ),
  CONSTRAINT account_yield_current_balance_scale CHECK (
    current_balance = trunc(current_balance, 2)
  ),
  CONSTRAINT account_yield_amount_scale CHECK (
    yield_amount = trunc(yield_amount, 2)
  )
);

CREATE INDEX account_yield_account_created_idx
  ON my_fin.account_yield (account_id, created_at DESC, id DESC);

-- Down Migration

DROP TABLE my_fin.account_yield;
