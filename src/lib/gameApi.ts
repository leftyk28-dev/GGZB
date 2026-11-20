import type { Rarity } from "./rarity";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TOKEN_KEY = "zombix.playerToken";
const DEVICE_KEY = "zombix.deviceId";
const UNEXPECTED_RESPONSE = "Сервер вернул неожиданный ответ.";

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export type LootItem = {
  id: string;
  name: string;
  value: number;
  image_key: string | null;
  rarity: Rarity;
  level: number;
  found_at: string;
};

export type CaseFind = Omit<LootItem, "id" | "found_at"> & {
  id: string | null;
  found_at: string | null;
  autoSold: boolean;
};

export type LevelInfo = {
  level: number;
  value: number;
  chance: number;
};

export type CaseItem = {
  name: string;
  rarity: Rarity;
  imageKey: string;
  chance: number;
  levels: LevelInfo[];
  priceRange: { min: number; max: number } | null;
};

export type CaseView = {
  key: string;
  name: string;
  price: number;
  category: "free" | "main" | "named";
  available: boolean;
  guaranteed: boolean;
  items: CaseItem[];
};

export type DealKind = "withdraw" | "deposit";
export type DealCurrency = "gold" | "rub";
export type DealStatus = "in_progress" | "completed" | "rejected";

export type DealTicket = {
  id: string;
  number: number;
  kind: DealKind;
  currency: DealCurrency;
  nickname: string | null;
  location: string | null;
  telegram: string | null;
  phone: string | null;
  bank: string | null;
  deal_time: string | null;
  amount: number;
  rub_amount: number | null;
  status: DealStatus;
  is_premium: boolean;
  created_at: string;
};

export type RankUp = {
  fromIndex: number;
  toIndex: number;
  reward: number;
};

export type RankInfo = {
  name: string;
  index: number;
  xp: number;
  currentThreshold: number;
  nextThreshold: number;
  progressInRank: number;
  rankSpan: number;
  progressPct: number;
  isMaxRank: boolean;
};

export type GameState = {
  token: string;
  nickname: string | null;
  email: string | null;
  password_hash: string | null;
  gold: number;
  searches: number;
  lastFreeCaseAt: string | null;
  serverTime: string;
  xp: number;
  rank: RankInfo;
  loot: LootItem[];
  tickets: DealTicket[];
  cases: CaseView[];
  freeCase: CaseView;
  guarantees: Record<string, number>;
};

export type ContractInput = {
  itemId: string;
  extraItemIds: string[];
  goldAmount: number;
  targetValue: number;
};

export type ContractOutcome = { won: boolean; chance: number; target: number };

type GoldDealDetails = {
  nickname: string;
  location: string;
  telegram: string;
};

export type DealTicketInput =
  | (GoldDealDetails & { kind: "deposit"; currency: "gold"; amount: number })
  | { kind: "deposit"; currency: "rub"; telegram: string; rubAmount: number }
  | (GoldDealDetails & { kind: "withdraw"; currency: "gold"; itemIds: string[] })
  | { kind: "withdraw"; currency: "rub"; phone: string; bank: string; itemIds: string[] };

type ResponseBody = Record<string, unknown>;

function isGameState(data: unknown): data is GameState {
  if (!data || typeof data !== "object") return false;
  const candidate = data as Partial<GameState>;
  return (
    typeof candidate.token === "string" &&
    typeof candidate.gold === "number" &&
    typeof candidate.searches === "number" &&
    Array.isArray(candidate.loot) &&
    Array.isArray(candidate.tickets) &&
    Array.isArray(candidate.cases) &&
    typeof candidate.freeCase === "object" && candidate.freeCase !== null &&
    typeof candidate.serverTime === "string" &&
    typeof candidate.xp === "number" &&
    typeof candidate.rank === "object" && candidate.rank !== null
  );
}

export class BannedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BannedError";
  }
}

async function callGame(action: string, payload: Record<string, unknown> = {}): Promise<ResponseBody> {
  const token = getStoredToken();

  let response: Response;
  try {
    response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ANON_KEY}`,
        Apikey: ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, token, deviceId: getDeviceId(), ...payload }),
    });
  } catch {
    throw new Error("Нет соединения с сервером. Проверьте интернет и попробуйте снова.");
  }

  const data = (await response.json().catch(() => null)) as ResponseBody | null;
  if (!response.ok) {
    if (data?.banned === true) throw new BannedError(typeof data.error === "string" ? data.error : "Вы заблокированы.");
    const message = typeof data?.error === "string" ? data.error : null;
    throw new Error(message ?? "Не удалось выполнить действие. Попробуйте еще раз.");
  }
  if (!data) throw new Error(UNEXPECTED_RESPONSE);
  return data;
}

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

function storeToken(token: string, remember: boolean) {
  const primary = remember ? localStorage : sessionStorage;
  const secondary = remember ? sessionStorage : localStorage;
  secondary.removeItem(TOKEN_KEY);
  primary.setItem(TOKEN_KEY, token);
}

function readState(data: ResponseBody, remember = localStorage.getItem(TOKEN_KEY) !== null): GameState {
  if (!isGameState(data)) throw new Error(UNEXPECTED_RESPONSE);
  storeToken(data.token, remember);
  return data;
}

export async function fetchState(): Promise<GameState> {
  return readState(await callGame("state"));
}

export async function setNickname(nickname: string): Promise<GameState> {
  return readState(await callGame("set-nickname", { nickname }));
}

export async function openCase(caseKey: string, count: number): Promise<{ state: GameState; finds: CaseFind[]; rankUp?: RankUp }> {
  const data = await callGame("open-case", { caseKey, count });
  const finds = data.finds as CaseFind[] | undefined;
  if (!Array.isArray(finds) || finds.length !== count) throw new Error(UNEXPECTED_RESPONSE);
  const rankUp = data.rankUp as RankUp | undefined;
  return { state: readState(data), finds, rankUp };
}

export async function openFreeCase(): Promise<{ state: GameState; finds: LootItem[]; rankUp?: RankUp }> {
  const data = await callGame("open-free-case");
  const finds = data.finds as LootItem[] | undefined;
  if (!Array.isArray(finds) || finds.length !== 1) throw new Error(UNEXPECTED_RESPONSE);
  const rankUp = data.rankUp as RankUp | undefined;
  return { state: readState(data), finds, rankUp };
}

export async function sellItem(itemId: string): Promise<GameState> {
  return readState(await callGame("sell", { itemId }));
}

export async function sellAllItems(): Promise<GameState> {
  return readState(await callGame("sell-all"));
}

export async function previewContract(input: ContractInput): Promise<{ chance: number }> {
  const data = await callGame("contract-preview", { ...input });
  if (typeof data.chance !== "number") throw new Error(UNEXPECTED_RESPONSE);
  return { chance: data.chance };
}

export async function runContract(input: ContractInput): Promise<{ state: GameState; outcome: ContractOutcome }> {
  const data = await callGame("contract", { ...input });
  const outcome = data.contract as ContractOutcome | undefined;
  if (!outcome) throw new Error(UNEXPECTED_RESPONSE);
  return { state: readState(data), outcome };
}

export async function createDealTicket(input: DealTicketInput): Promise<GameState> {
  return readState(await callGame("create-ticket", { ...input }));
}

export async function redeemPromoCode(code: string): Promise<GameState> {
  return readState(await callGame("redeem-promo-code", { code }));
}

export type MarketDirection = "up" | "flat" | "down";

export type MarketBet = {
  id: string;
  roundStart: string;
  direction: MarketDirection;
  stake: number;
  status: "open" | "won" | "lost";
  payout: number | null;
  createdAt: string;
};

export type MarketState = {
  serverTime: string;
  roundStart: string;
  roundEnd: string;
  value: number;
  history: { roundStart: string; direction: MarketDirection; valueBefore: number; valueAfter: number }[];
  myBet: MarketBet | null;
  myBets: MarketBet[];
};

export async function fetchMarket(): Promise<{ market: MarketState; gold: number }> {
  const data = await callGame("market-state");
  const market = data.market as MarketState | undefined;
  if (!market || typeof data.gold !== "number") throw new Error(UNEXPECTED_RESPONSE);
  return { market, gold: data.gold };
}

export async function placeMarketBet(direction: MarketDirection, stake: number): Promise<{ market: MarketState; gold: number }> {
  const data = await callGame("market-bet", { direction, stake });
  const market = data.market as MarketState | undefined;
  if (!market || typeof data.gold !== "number") throw new Error(UNEXPECTED_RESPONSE);
  return { market, gold: data.gold };
}

export type PremiumTicketInput = {
  nickname: string;
  location: string;
  telegram: string;
};

export async function createPremiumTicket(input: PremiumTicketInput): Promise<GameState> {
  return readState(await callGame("create-premium-ticket", { ...input }));
}

export async function signup(nickname: string, login: string, password: string, remember: boolean): Promise<GameState> {
  return readState(await callGame("auth-signup", { nickname, login, password }), remember);
}

export async function signin(login: string, password: string, remember: boolean): Promise<GameState> {
  return readState(await callGame("auth-signin", { login, password }), remember);
}

export type ShowcaseProduct = {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  type: string;
};

export async function fetchShowcase(): Promise<ShowcaseProduct[]> {
  const data = await callGame("showcase-list");
  const products = data.products as ShowcaseProduct[] | undefined;
  if (!Array.isArray(products)) throw new Error(UNEXPECTED_RESPONSE);
  return products;
}

export async function buyShowcaseProduct(
  productId: string,
  details: { nickname?: string; telegram: string },
): Promise<GameState> {
  return readState(await callGame("showcase-buy", { productId, ...details }));
}
