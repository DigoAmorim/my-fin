-- Up Migration

DROP TABLE IF EXISTS my_fin.account;

-- Down Migration

CREATE TABLE my_fin.account (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  pluggy_item_id VARCHAR(100),
  current_balance NUMERIC(12, 2) NOT NULL,
  balance_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
