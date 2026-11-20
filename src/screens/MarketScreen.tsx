import { useEffect, useState } from "react";
import {
  fetchMarket,
  placeMarketBet,
  type GameState,
  type MarketDirection,
  type MarketState,
} from "../lib/gameApi";

const MIN_STAKE = 10;

const DIRECTION_LABELS: Record<MarketDirection, string> = {
  up: "Рост",
  flat: "Статичный",
  down: "Падение",
};

const DIRECTIONS: MarketDirection[] = ["up", "flat", "down"];

type MarketScreenProps = {
  state: GameState;
  onUpdate: (state: GameState) => void;
};

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function chartValues(market: MarketState): number[] {
  if (market.history.length === 0) return [];
  return [market.history[0].valueBefore, ...market.history.map((h) => h.valueAfter)];
}

function MarketChart({ values }: { values: number[] }) {
  if (values.length < 2) return <p className="loading-text">История пока пуста.</p>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 600;
  const height = 220;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / span) * (height - 20) - 10}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="График значения" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="var(--primary-500)" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

export function MarketScreen({ state, onUpdate }: MarketScreenProps) {
  const [market, setMarket] = useState<MarketState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<MarketDirection | null>(null);
  const [stake, setStake] = useState<string>(String(MIN_STAKE));
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [clockOffset, setClockOffset] = useState(0);

  const load = () => {
    setError(null);
    fetchMarket()
      .then(({ market: next, gold }) => {
        setClockOffset(new Date(next.serverTime).getTime() - Date.now());
        setMarket(next);
        onUpdate({ ...state, gold });
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Не удалось загрузить график."));
  };

  useEffect(load, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const stakeValue = Number(stake);
  const stakeValid = Number.isFinite(stakeValue) && stakeValue >= MIN_STAKE && Math.round(stakeValue * 100) === stakeValue * 100;
  const canBet = !busy && !!direction && stakeValid && !market?.myBet;

  const submit = () => {
    if (!direction || !canBet) return;
    setBusy(true);
    setError(null);
    placeMarketBet(direction, stakeValue)
      .then(({ market: next, gold }) => {
        setClockOffset(new Date(next.serverTime).getTime() - Date.now());
        setMarket(next);
        onUpdate({ ...state, gold });
        setDirection(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Не удалось сделать ставку."))
      .finally(() => setBusy(false));
  };

  const timeLeft = market ? new Date(market.roundEnd).getTime() - (now + clockOffset) : 0;

  return (
    <section className="panel">
      <h2>График</h2>
      {error && (
        <div className="panel panel-error">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={load}>Попробовать снова</button>
        </div>
      )}
      {!market && !error && <p className="loading-text">Загрузка графика...</p>}
      {market && (
        <>
          <p>Текущее значение: <strong>{market.value.toFixed(2)}</strong></p>
          <MarketChart values={chartValues(market)} />
          <p>До следующего обновления (05:00 UTC): {formatCountdown(timeLeft)}</p>

          {market.myBet ? (
            <p>
              Ваша ставка на этот раунд: {DIRECTION_LABELS[market.myBet.direction]}, {market.myBet.stake} голды.
            </p>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <div role="group" aria-label="Направление">
                {DIRECTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`btn ${direction === d ? "btn-primary" : "btn-secondary"}`}
                    aria-pressed={direction === d}
                    onClick={() => setDirection(d)}
                  >
                    {DIRECTION_LABELS[d]}
                  </button>
                ))}
              </div>
              <label>
                Ставка (минимум {MIN_STAKE})
                <input type="number" min={MIN_STAKE} step="0.01" value={stake} onChange={(e) => setStake(e.target.value)} />
              </label>
              <button type="submit" className="btn btn-primary" disabled={!canBet}>
                {busy ? "Отправка..." : "Сделать ставку"}
              </button>
            </form>
          )}

          <h3>История ставок</h3>
          {market.myBets.length === 0 && <p>Ставок пока нет.</p>}
          <ul>
            {market.myBets.map((bet) => (
              <li key={bet.id}>
                {DIRECTION_LABELS[bet.direction]}: {bet.stake} голды,{" "}
                {bet.status === "open" ? "ожидает" : bet.status === "won" ? `выигрыш ${bet.payout}` : `проигрыш, возврат ${bet.payout}`}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
