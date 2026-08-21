-- Per-FI relational ingestion kernel — the working form of docs/DATA-MODEL.md.
-- Any relational entity ingests as rows, never schema. One SQLite file per FI.
--
-- MEMBER is minimal here: the kernel treats identity as external; this table
-- holds only a stable id and a synthetic display name (no PII is ever stored —
-- names, SSNs, and contact details from the source files never reach this DB).

CREATE TABLE IF NOT EXISTS entity_def (
  id INTEGER PRIMARY KEY,
  fi_id TEXT NOT NULL,
  name TEXT NOT NULL,              -- the FI's own words: "Loans", "Offers"
  pulsate_category TEXT NOT NULL,  -- loan | deposit | offer | ... | UNKNOWN
  purpose TEXT NOT NULL,           -- segment | campaign | both
  source TEXT NOT NULL DEFAULT '', -- which connected source declared this entity
  UNIQUE (fi_id, name)
);

CREATE TABLE IF NOT EXISTS field_def (
  id INTEGER PRIMARY KEY,
  entity_def_id INTEGER NOT NULL REFERENCES entity_def(id),
  name TEXT NOT NULL,              -- as ingested: "Loan Balance"
  user_label TEXT NOT NULL,        -- what marketers see: "Balance"
  type TEXT NOT NULL,              -- string | number | currency | date | bool
  semantic_role TEXT,              -- optional: recurring_date, balance, code
  UNIQUE (entity_def_id, name)
);

CREATE TABLE IF NOT EXISTS member (
  id INTEGER PRIMARY KEY,
  fi_id TEXT NOT NULL,
  code TEXT NOT NULL,              -- stable display id (M001…); no source PII
  external_key TEXT NOT NULL,      -- salted hash of the source identity
  UNIQUE (fi_id, external_key),
  UNIQUE (fi_id, code)
);

CREATE TABLE IF NOT EXISTS record (
  id INTEGER PRIMARY KEY,
  entity_def_id INTEGER NOT NULL REFERENCES entity_def(id),
  external_key TEXT NOT NULL,      -- stable instance id from the source
  status TEXT NOT NULL DEFAULT 'open',
  updated_at TEXT NOT NULL,
  UNIQUE (entity_def_id, external_key)
);

CREATE TABLE IF NOT EXISTS record_member (
  record_id INTEGER NOT NULL REFERENCES record(id),
  member_id INTEGER NOT NULL REFERENCES member(id),
  role TEXT NOT NULL,              -- primary | joint | beneficiary
  UNIQUE (record_id, member_id)
);

CREATE TABLE IF NOT EXISTS value (
  record_id INTEGER NOT NULL REFERENCES record(id),
  field_def_id INTEGER NOT NULL REFERENCES field_def(id),
  value TEXT NOT NULL,             -- typed by field_def.type; absent row = not set
  UNIQUE (record_id, field_def_id)
);

CREATE TABLE IF NOT EXISTS value_change (
  record_id INTEGER NOT NULL REFERENCES record(id),
  field_def_id INTEGER NOT NULL REFERENCES field_def(id),
  old_value TEXT,                  -- null = was not set
  new_value TEXT,                  -- null = became not set
  changed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS code_map (
  field_def_id INTEGER NOT NULL REFERENCES field_def(id),
  raw_code TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',  -- '' = needs mapping (the attention queue)
  category TEXT,                   -- pulsate category the code resolves to
  UNIQUE (field_def_id, raw_code)
);

-- Operational bookkeeping for the ingest CLI, not part of the logical model.
CREATE TABLE IF NOT EXISTS ingest_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_record_entity ON record(entity_def_id);
CREATE INDEX IF NOT EXISTS idx_rm_member ON record_member(member_id);
CREATE INDEX IF NOT EXISTS idx_rm_record ON record_member(record_id);
CREATE INDEX IF NOT EXISTS idx_value_field ON value(field_def_id);
CREATE INDEX IF NOT EXISTS idx_change_record ON value_change(record_id, field_def_id);
