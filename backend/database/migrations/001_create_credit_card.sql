-- Up Migration

CREATE SCHEMA IF NOT EXISTS my_fin;

CREATE TABLE my_fin.credit_card (
  code TEXT PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  due_day SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 31)
);

-- Down Migration

DROP TABLE my_fin.credit_card;