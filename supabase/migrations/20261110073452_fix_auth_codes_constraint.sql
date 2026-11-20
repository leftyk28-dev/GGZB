/*
# Fix auth_codes code constraint

The auth_codes table had a CHECK constraint requiring code to be exactly 6 chars.
We now use Supabase's built-in OTP for email verification, so the code column
stores a marker string instead of a numeric code. This drops the length constraint.

1. Modified Tables
- auth_codes: drops CHECK (char_length(code) = 6) constraint on code column
2. Security
- No RLS or policy changes
*/

ALTER TABLE auth_codes DROP CONSTRAINT IF EXISTS auth_codes_code_check;
