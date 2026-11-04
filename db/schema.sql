-- -- Run in the Supabase SQL editor (or psql). Safe to run again: it also upgrades an older database.

-- -- Products. Each product gets its own lot per day and its own shelf life.
-- CREATE TABLE IF NOT EXISTS products (
--   id           serial PRIMARY KEY,
--   name         text UNIQUE NOT NULL,
--   shelf_months int  NOT NULL DEFAULT 11 CHECK (shelf_months BETWEEN 0 AND 120),
--   shelf_days   int  NOT NULL DEFAULT 12 CHECK (shelf_days BETWEEN 0 AND 366),
--   active       boolean NOT NULL DEFAULT true,
--   sort         int  NOT NULL DEFAULT 0,
--   created_at   timestamptz NOT NULL DEFAULT now()
-- );
-- INSERT INTO products (name, sort) VALUES ('Serum', 1), ('Cream', 2), ('Cleanser', 3)
-- ON CONFLICT (name) DO NOTHING;

-- -- One row per product per production day. The code is random, made on that day's first print.
-- CREATE TABLE IF NOT EXISTS lots (
--   id         serial PRIMARY KEY,
--   lot_date   date NOT NULL,                 -- the day, in LOT_TIMEZONE (Europe/Madrid)
--   code       text UNIQUE NOT NULL,          -- random part only, e.g. K7M2QX
--   created_at timestamptz NOT NULL DEFAULT now()
-- );
-- ALTER TABLE lots ADD COLUMN IF NOT EXISTS product_id int REFERENCES products(id);
-- ALTER TABLE lots DROP CONSTRAINT IF EXISTS lots_lot_date_key;   -- old rule: one lot per day for everything
-- CREATE UNIQUE INDEX IF NOT EXISTS lots_product_day_idx ON lots (product_id, lot_date);

-- -- One row per print job (one press of "Print", any quantity).
-- CREATE TABLE IF NOT EXISTS prints (
--   id         serial PRIMARY KEY,
--   lot_id     int NOT NULL REFERENCES lots(id),
--   lot        text NOT NULL,                 -- full code as printed, e.g. TSA26K7M2QX
--   preset     text NOT NULL,                 -- label type: serum-box / crema-box / cleanser-box / bottle
--   quantity   int  NOT NULL CHECK (quantity > 0),
--   exp_date   date NOT NULL,
--   status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printed', 'failed')),
--   printed_at timestamptz NOT NULL DEFAULT now()
-- );
-- ALTER TABLE prints ADD COLUMN IF NOT EXISTS note text;  -- reason, required when printing an earlier day's lot
-- CREATE INDEX IF NOT EXISTS prints_lot_id_idx ON prints (lot_id);
-- CREATE INDEX IF NOT EXISTS prints_printed_at_idx ON prints (printed_at);

-- -- Raw material batches used in a lot (traceability: which lots used supplier batch X?).
-- CREATE TABLE IF NOT EXISTS lot_materials (
--   id         serial PRIMARY KEY,
--   lot_id     int  NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
--   material   text NOT NULL,                 -- e.g. Hyaluronic acid
--   supplier   text,
--   batch      text NOT NULL,                 -- the supplier's batch / lot number
--   created_at timestamptz NOT NULL DEFAULT now()
-- );
-- CREATE INDEX IF NOT EXISTS lot_materials_lot_id_idx ON lot_materials (lot_id);
-- CREATE INDEX IF NOT EXISTS lot_materials_batch_idx ON lot_materials (lower(batch));

-- -- The app talks to Postgres directly (DATABASE_URL), never through the Supabase REST API.
-- -- RLS with no policies keeps these tables closed to the public anon/authenticated keys.
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE prints ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE lot_materials ENABLE ROW LEVEL SECURITY;

-- -- App settings shared by every device: label template, printer alignment, selected product, quick jobs.
-- CREATE TABLE IF NOT EXISTS settings (
--   key        text PRIMARY KEY,              -- "template" | "print"
--   value      jsonb NOT NULL,
--   updated_at timestamptz NOT NULL DEFAULT now()
-- );
-- ALTER TABLE settings ENABLE ROW LEVEL SECURITY;


-- Run in the Supabase SQL editor (or psql). Safe to run again: it also upgrades an older database.

CREATE TABLE IF NOT EXISTS products (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  shelf_months int NOT NULL DEFAULT 11 CHECK (shelf_months BETWEEN 0 AND 120),
  shelf_days int NOT NULL DEFAULT 12 CHECK (shelf_days BETWEEN 0 AND 366),
  active boolean NOT NULL DEFAULT true,
  surface text NOT NULL DEFAULT '',
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS surface text NOT NULL DEFAULT '';
ALTER TABLE products DROP COLUMN IF EXISTS daily_target;
INSERT INTO products (name, sort) VALUES ('Serum', 1), ('Cream', 2), ('Cleanser', 3)
ON CONFLICT (name) DO NOTHING;

-- One row per production day. New print jobs across all products and label types share kind = "day".
CREATE TABLE IF NOT EXISTS lots (
  id         serial PRIMARY KEY,
  lot_date   date NOT NULL,                 -- the day, in LOT_TIMEZONE (Europe/Madrid)
  code       text UNIQUE NOT NULL,          -- random part only, e.g. K7M2QX
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Older databases: earlier lots have no kind (kept as history); the app only makes and reads lots with a kind.
ALTER TABLE lots ADD COLUMN IF NOT EXISTS kind text;
ALTER TABLE lots DROP CONSTRAINT IF EXISTS lots_kind_check;
ALTER TABLE lots ADD CONSTRAINT lots_kind_check CHECK (kind IN ('box', 'bottle', 'day'));
ALTER TABLE lots DROP CONSTRAINT IF EXISTS lots_lot_date_key;   -- old rule: one lot per day for everything
DROP INDEX IF EXISTS lots_day_idx;                               -- previous version: one lot per day for every label type
CREATE UNIQUE INDEX IF NOT EXISTS lots_day_kind_idx ON lots (lot_date, kind) WHERE kind IS NOT NULL;

-- One row per print job (one press of "Print", any quantity).
CREATE TABLE IF NOT EXISTS prints (
  id         serial PRIMARY KEY,
  lot_id     int NOT NULL REFERENCES lots(id),
  product_id int REFERENCES products(id),
  lot        text NOT NULL,                 -- full code as printed, e.g. TSA26K7M2QX
  preset     text NOT NULL,                 -- label type: serum-box / crema-box / cleanser-box / bottle
  quantity   int  NOT NULL CHECK (quantity > 0),
  exp_date   date NOT NULL,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printed', 'failed')),
  printed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE prints ADD COLUMN IF NOT EXISTS product_id int REFERENCES products(id);
ALTER TABLE prints ADD COLUMN IF NOT EXISTS note text;  -- reason, required when printing an earlier day's lot
CREATE INDEX IF NOT EXISTS prints_lot_id_idx ON prints (lot_id);
CREATE INDEX IF NOT EXISTS prints_printed_at_idx ON prints (printed_at);

-- Raw material batches used in a lot (traceability: which lots used supplier batch X?).
CREATE TABLE IF NOT EXISTS lot_materials (
  id         serial PRIMARY KEY,
  lot_id     int  NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  material   text NOT NULL,                 -- e.g. Hyaluronic acid
  supplier   text,
  batch      text NOT NULL,                 -- the supplier's batch / lot number
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lot_materials_lot_id_idx ON lot_materials (lot_id);
CREATE INDEX IF NOT EXISTS lot_materials_batch_idx ON lot_materials (lower(batch));

-- The app talks to Postgres directly (DATABASE_URL), never through the Supabase REST API.
-- RLS with no policies keeps these tables closed to the public anon/authenticated keys.
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE prints ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- App settings shared by every device: label template, printer alignment, quick jobs.
CREATE TABLE IF NOT EXISTS settings (
  key        text PRIMARY KEY,              -- "template" | "print" | "presets"
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
