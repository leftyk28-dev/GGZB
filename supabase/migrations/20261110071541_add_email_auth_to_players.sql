/*
# Add email auth: email/password on players + auth_codes table

1. Modified Tables
- `players`: adds `email` (text, unique, nullable — only set after verified signup) and `password_hash` (text, nullable — bcrypt-style hash stored as raw string). Existing players keep playing anonymously via token; they can sign up later.

2. New Tables
- `auth_codes`: stores 6-digit email verification codes. Columns: id (uuid PK), email (text), code (text 6 chars), device_id (text), nickname (text), password_hash (text), expires_at (timestamptz), used (boolean default false), created_at (timestamptz default now()). Codes expire after 10 minutes and can only be used once.

3. Security
- `auth_codes`: RLS enabled, no policies for anon/authenticated (only service_role can read/write via edge function). Grant SELECT, INSERT, UPDATE to service_role.
- `players`: existing policies unchanged. New columns readable through existing policies. Only service_role writes to email/password_hash.
- No new public RPC functions.

4. Notes
- One account per device is enforced in the game edge function, not at the DB level — the server checks whether a player with the same device_id already has an email before allowing signup.
- Email uniqueness is enforced by a unique constraint so duplicate accounts are impossible even if the server check is bypassed.
*/

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS email text UNIQUE;
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS password_hash text;

CREATE TABLE IF NOT EXISTS auth_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL CHECK (char_length(code) = 6),
  device_id text,
  nickname text,
  password_hash text,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_codes_email_idx ON auth_codes (email);

ALTER TABLE auth_codes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON auth_codes TO service_role;
