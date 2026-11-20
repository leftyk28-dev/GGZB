/*
# Add daily market chart rounds and player bets

1. New Tables
- `market_rounds`: one row per finished daily round. Stores the round window (starts at 05:00 UTC, lasts 24 hours), the chosen direction (up / flat / down), and the chart value before and after.
- `market_bets`: a player's bet on the direction of one round. Stores the stake, the chosen direction, status (open / won / lost), and the payout.

2. New Functions
- `market_round_start(timestamptz)`: returns the 05:00 UTC boundary that opens the round containing the given time.
- `market_settle()`: server-side. Closes every finished round since the last one, picks a direction at random, moves the chart value, settles open bets and credits winnings. Serialized with an advisory lock so concurrent calls cannot double-settle.
- `market_place_bet(player, direction, stake)`: settles pending rounds first, then deducts the stake from the player's gold and records the bet for the current round. One bet per player per round. Minimum stake 10.

3. Settlement rules
- Win: payout = stake * 1.2.
- Loss: payout = stake / 1.2 (rounded to 2 decimals).

4. Security
- Row level security is enabled on both tables with no policies, so anon and authenticated roles cannot read or write them directly.
- Only the server-side function (service_role) receives grants on the tables and functions.
- Functions are not executable by PUBLIC, anon or authenticated.

5. Notes
- Time and chart values are decided only on the server (database clock), never on the client.
*/

CREATE OR REPLACE FUNCTION market_round_start(p_at timestamptz)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (date_trunc('day', timezone('UTC', p_at) - interval '5 hours') + interval '5 hours') AT TIME ZONE 'UTC';
$$;

CREATE TABLE IF NOT EXISTS market_rounds (
  round_start timestamptz PRIMARY KEY,
  round_end timestamptz NOT NULL,
  direction text NOT NULL CHECK (direction IN ('up', 'flat', 'down')),
  value_before numeric(12, 2) NOT NULL,
  value_after numeric(12, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  round_start timestamptz NOT NULL,
  direction text NOT NULL CHECK (direction IN ('up', 'flat', 'down')),
  stake numeric(12, 2) NOT NULL CHECK (stake >= 10),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  payout numeric(12, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  UNIQUE (player_id, round_start)
);

CREATE INDEX IF NOT EXISTS market_bets_player_created_idx ON market_bets (player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS market_bets_open_round_idx ON market_bets (round_start) WHERE status = 'open';

ALTER TABLE market_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_bets ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON market_rounds TO service_role;
GRANT SELECT, INSERT, UPDATE ON market_bets TO service_role;

CREATE OR REPLACE FUNCTION market_settle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current timestamptz := market_round_start(now());
  v_start timestamptz;
  v_value numeric(12, 2);
  v_after numeric(12, 2);
  v_roll double precision;
  v_direction text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('market_settle'));

  SELECT round_start + interval '1 day', value_after
    INTO v_start, v_value
    FROM market_rounds
    ORDER BY round_start DESC
    LIMIT 1;
  IF NOT FOUND THEN
    v_start := v_current - interval '1 day';
    v_value := 100;
  END IF;

  WHILE v_start < v_current LOOP
    v_roll := random();
    IF v_roll < 1.0 / 3 THEN
      v_direction := 'up';
    ELSIF v_roll < 2.0 / 3 THEN
      v_direction := 'flat';
    ELSE
      v_direction := 'down';
    END IF;

    v_after := v_value;
    IF v_direction = 'up' THEN
      v_after := round((v_value * (1 + 0.03 + random() * 0.09))::numeric, 2);
    ELSIF v_direction = 'down' THEN
      v_after := greatest(1, round((v_value * (1 - 0.03 - random() * 0.09))::numeric, 2));
    END IF;

    INSERT INTO market_rounds (round_start, round_end, direction, value_before, value_after)
    VALUES (v_start, v_start + interval '1 day', v_direction, v_value, v_after);

    WITH settled AS (
      UPDATE market_bets b
      SET status = CASE WHEN b.direction = v_direction THEN 'won' ELSE 'lost' END,
          payout = round(CASE WHEN b.direction = v_direction THEN b.stake * 1.2 ELSE b.stake / 1.2 END, 2),
          settled_at = now()
      WHERE b.round_start = v_start AND b.status = 'open'
      RETURNING b.player_id, b.payout
    )
    UPDATE players p
    SET gold = p.gold + s.total
    FROM (SELECT player_id, sum(payout) AS total FROM settled GROUP BY player_id) s
    WHERE p.id = s.player_id;

    v_value := v_after;
    v_start := v_start + interval '1 day';
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION market_place_bet(p_player_id uuid, p_direction text, p_stake numeric)
RETURNS market_bets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round timestamptz := market_round_start(now());
  v_gold numeric(12, 2);
  v_bet market_bets;
BEGIN
  PERFORM market_settle();

  IF p_direction IS NULL OR p_direction NOT IN ('up', 'flat', 'down') THEN
    RAISE EXCEPTION 'invalid_direction';
  END IF;
  IF p_stake IS NULL OR p_stake < 10 THEN
    RAISE EXCEPTION 'stake_too_small';
  END IF;

  SELECT gold INTO v_gold FROM players WHERE id = p_player_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'player_not_found';
  END IF;
  IF v_gold < p_stake THEN
    RAISE EXCEPTION 'insufficient_gold';
  END IF;

  INSERT INTO market_bets (player_id, round_start, direction, stake)
  VALUES (p_player_id, v_round, p_direction, round(p_stake, 2))
  RETURNING * INTO v_bet;

  UPDATE players SET gold = gold - round(p_stake, 2) WHERE id = p_player_id;

  RETURN v_bet;
END;
$$;

REVOKE EXECUTE ON FUNCTION market_round_start(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION market_settle() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION market_place_bet(uuid, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION market_round_start(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION market_settle() TO service_role;
GRANT EXECUTE ON FUNCTION market_place_bet(uuid, text, numeric) TO service_role;
