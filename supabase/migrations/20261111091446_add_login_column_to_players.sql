/*
# Separate login from in-game nickname

1. Modified Tables
- `players`
  - New column `login` (text): the name used to sign in with the password.
  - Existing password accounts get their login copied from the old email field, which held the login before.

2. Security
- No RLS or grant changes. Login values are unique across players.

3. Important Notes
- The `login` column is unique (exact match). Case-insensitive duplicate checks are done in the game function.
- Guest players without a password keep `login` empty.
*/

ALTER TABLE players ADD COLUMN IF NOT EXISTS login text;

UPDATE players
SET login = email
WHERE password_hash IS NOT NULL AND login IS NULL AND email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS players_login_key ON players (login) WHERE login IS NOT NULL;
