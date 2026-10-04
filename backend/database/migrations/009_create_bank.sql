-- Up Migration

CREATE TABLE IF NOT EXISTS my_fin.bank (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bank_name VARCHAR(100) NOT NULL,
  checking_account BOOLEAN NOT NULL DEFAULT FALSE,
  savings_account BOOLEAN NOT NULL DEFAULT FALSE,
  fixed_income BOOLEAN NOT NULL DEFAULT FALSE,
  variable_income BOOLEAN NOT NULL DEFAULT FALSE,
  pluggy_item_id VARCHAR(100) NOT NULL,
  CONSTRAINT bank_open_finance_option_required CHECK (
    checking_account OR savings_account OR fixed_income OR variable_income
  )
);

-- Down Migration

DROP TABLE my_fin.bank;
