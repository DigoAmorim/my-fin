-- Up Migration

CREATE TABLE my_fin.account_snapshot (
  account_id INTEGER NOT NULL REFERENCES my_fin.account(id) ON DELETE RESTRICT,
  snapshot_month DATE NOT NULL CHECK (
    snapshot_month = date_trunc('month', snapshot_month)::date
  ),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount = trunc(amount, 2)),
  PRIMARY KEY (account_id, snapshot_month)
);

-- Down Migration

DROP TABLE my_fin.account_snapshot;
