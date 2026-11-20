/*
# Add device fingerprint column to players

1. Modified Tables
- `players`: adds `device_id` (text, nullable) to identify the device a player first logged in from. Used to ban by device instead of by IP.

2. Security
- No policy or grant changes. The column is readable through existing RLS policies and writable only by the service_role (edge functions).
*/

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS device_id text;
