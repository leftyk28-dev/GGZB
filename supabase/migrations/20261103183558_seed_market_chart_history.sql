/*
# Seed market chart history on first settlement

1. Modified Functions
- `market_settle()`: when no daily round exists yet, the chart now starts 30 days back instead of one day back, so the first visit already produces a visible history line.

2. Behavior
- Existing rounds are untouched. Once any round exists, settlement continues from the last round exactly as before.
- Directions remain server-random (one third up, one third flat, one third down) and are decided only on the server.

3. Security
- No change to grants, policies, or execute permissions. The function stays restricted to service_role.
*/

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
    v_start := v_current - interval '30 days';
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
