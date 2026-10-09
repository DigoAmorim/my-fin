-- Up Migration

CREATE INDEX account_snapshot_month_idx
  ON my_fin.account_snapshot (snapshot_month DESC);

-- Down Migration

DROP INDEX my_fin.account_snapshot_month_idx;
