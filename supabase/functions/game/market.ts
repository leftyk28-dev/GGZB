import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

export class MarketRejected extends Error {}

const DIRECTIONS = ["up", "flat", "down"];
const MIN_STAKE = 10;
const START_VALUE = 100;
const HISTORY_LENGTH = 60;
const MY_BETS_LENGTH = 20;
const ROUND_MS = 24 * 60 * 60 * 1000;
const ROUND_COLUMNS = "round_start, direction, value_before, value_after";
const BET_COLUMNS = "id, round_start, direction, stake, status, payout, created_at";

type RoundRow = { round_start: string; direction: string; value_before: number; value_after: number };
type BetRow = {
  id: string;
  round_start: string;
  direction: string;
  stake: number;
  status: string;
  payout: number | null;
  created_at: string;
};

function mapRound(row: RoundRow) {
  return {
    roundStart: row.round_start,
    direction: row.direction,
    valueBefore: row.value_before,
    valueAfter: row.value_after,
  };
}

function mapBet(row: BetRow) {
  return {
    id: row.id,
    roundStart: row.round_start,
    direction: row.direction,
    stake: row.stake,
    status: row.status,
    payout: row.payout,
    createdAt: row.created_at,
  };
}

export async function getMarketState(supabase: SupabaseClient, playerId: string) {
  const { error: settleError } = await supabase.rpc("market_settle");
  if (settleError) throw settleError;

  const [roundsRes, betsRes, roundRes] = await Promise.all([
    supabase
      .from("market_rounds")
      .select(ROUND_COLUMNS)
      .order("round_start", { ascending: false })
      .limit(HISTORY_LENGTH),
    supabase
      .from("market_bets")
      .select(BET_COLUMNS)
      .eq("player_id", playerId)
      .order("created_at", { ascending: false })
      .limit(MY_BETS_LENGTH),
    supabase.rpc("market_round_start", { p_at: new Date().toISOString() }),
  ]);
  if (roundsRes.error) throw roundsRes.error;
  if (betsRes.error) throw betsRes.error;
  if (roundRes.error) throw roundRes.error;

  const rounds = (roundsRes.data as RoundRow[]).reverse();
  const bets = betsRes.data as BetRow[];
  const roundStart = roundRes.data as string;
  const roundStartMs = new Date(roundStart).getTime();
  const currentBet = bets.find((bet) => new Date(bet.round_start).getTime() === roundStartMs);

  return {
    serverTime: new Date().toISOString(),
    roundStart,
    roundEnd: new Date(roundStartMs + ROUND_MS).toISOString(),
    value: rounds.at(-1)?.value_after ?? START_VALUE,
    history: rounds.map(mapRound),
    myBet: currentBet ? mapBet(currentBet) : null,
    myBets: bets.map(mapBet),
  };
}

function parseBet(body: Record<string, unknown>) {
  const { direction, stake } = body;
  if (typeof direction !== "string" || !DIRECTIONS.includes(direction)) {
    throw new MarketRejected("Выберите рост, статику или падение.");
  }
  if (typeof stake !== "number" || !Number.isFinite(stake) || Number(stake.toFixed(2)) !== stake || stake < MIN_STAKE) {
    throw new MarketRejected(`Минимальная ставка — ${MIN_STAKE} голды.`);
  }
  return { direction, stake };
}

function mapBetError(error: { code?: string; message: string }): Error {
  if (error.code === "23505") return new MarketRejected("Вы уже сделали ставку на этот раунд.");
  if (error.message.includes("insufficient_gold")) return new MarketRejected("Недостаточно голды для ставки.");
  if (error.message.includes("stake_too_small")) return new MarketRejected(`Минимальная ставка — ${MIN_STAKE} голды.`);
  if (error.message.includes("invalid_direction")) return new MarketRejected("Выберите рост, статику или падение.");
  if (error.message.includes("player_not_found")) return new MarketRejected("Игрок не найден. Обновите страницу.");
  return new Error(error.message);
}

export async function placeMarketBet(supabase: SupabaseClient, playerId: string, body: Record<string, unknown>) {
  const { direction, stake } = parseBet(body);
  const { error } = await supabase.rpc("market_place_bet", {
    p_player_id: playerId,
    p_direction: direction,
    p_stake: stake,
  });
  if (error) throw mapBetError(error);

  const { data: player, error: goldError } = await supabase
    .from("players")
    .select("gold")
    .eq("id", playerId)
    .maybeSingle();
  if (goldError) throw goldError;
  if (!player) throw new MarketRejected("Игрок не найден. Обновите страницу.");

  return { market: await getMarketState(supabase, playerId), gold: player.gold };
}
