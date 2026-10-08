CREATE TABLE IF NOT EXISTS cog_keys (
 id TEXT PRIMARY KEY,
 code TEXT NOT NULL DEFAULT '' COLLATE NOCASE,
 name TEXT NOT NULL,
 location TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL CHECK(category IN ('work','plant','lodging','other')),
 notes TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 created_by TEXT NOT NULL REFERENCES cog_users(id),
 archived_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_keys_code ON cog_keys(code COLLATE NOCASE) WHERE code <> '';
CREATE TABLE IF NOT EXISTS cog_key_loans (
 id TEXT PRIMARY KEY,
 key_id TEXT NOT NULL REFERENCES cog_keys(id),
 key_code TEXT NOT NULL DEFAULT '',
 key_name TEXT NOT NULL,
 key_location TEXT NOT NULL DEFAULT '',
 key_category TEXT NOT NULL CHECK(key_category IN ('work','plant','lodging','other')),
 holder TEXT NOT NULL,
 checked_out_at TEXT NOT NULL,
 expected_return TEXT NOT NULL DEFAULT '',
 checkout_notes TEXT NOT NULL DEFAULT '',
 checkout_author_id TEXT NOT NULL REFERENCES cog_users(id),
 checkout_author_name TEXT NOT NULL,
 created_at TEXT NOT NULL,
 returned_at TEXT,
 return_notes TEXT NOT NULL DEFAULT '',
 return_author_id TEXT REFERENCES cog_users(id),
 return_author_name TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_key_open_loan ON cog_key_loans(key_id) WHERE returned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_key_loans_period ON cog_key_loans(checked_out_at);
CREATE INDEX IF NOT EXISTS idx_key_loans_key ON cog_key_loans(key_id,returned_at);
