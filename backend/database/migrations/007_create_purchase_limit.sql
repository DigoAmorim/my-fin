-- Up Migration

CREATE TABLE my_fin.purchase_limit (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  purchase_type VARCHAR(20) NOT NULL UNIQUE CHECK (
    purchase_type IN ('first_fortnight', 'second_fortnight', 'installment_plan', 'recurring')
  ),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0)
);

-- Down Migration

DROP TABLE my_fin.purchase_limit;
