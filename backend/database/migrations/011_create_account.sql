-- Up Migration

CREATE TABLE my_fin.account (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bank_id INTEGER REFERENCES my_fin.bank(id) ON DELETE SET NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('checking', 'savings')),
  balance NUMERIC(14, 2) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('manual', 'pluggy')),
  pluggy_account_id VARCHAR(100),
  CONSTRAINT account_source_pluggy_id CHECK (
    (source = 'pluggy' AND pluggy_account_id IS NOT NULL)
    OR (source = 'manual' AND pluggy_account_id IS NULL)
  ),
  CONSTRAINT account_bank_pluggy_id_unique UNIQUE (bank_id, pluggy_account_id)
);

CREATE INDEX account_bank_name_idx ON my_fin.account (bank_name);

-- Down Migration

DROP TABLE my_fin.account;
