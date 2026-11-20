import type { DealTicket } from "./gameApi";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ADMIN_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/admin`;
const UNEXPECTED_RESPONSE = "Сервер вернул неожиданный ответ.";

export class AdminAuthError extends Error {}

const SESSION_KEY = "zombix.adminSession";

export function getAdminSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function saveAdminSession(accessToken: string) {
  localStorage.setItem(SESSION_KEY, accessToken);
}

export function clearAdminSession() {
  localStorage.removeItem(SESSION_KEY);
}

type AuthBody = { access_token?: unknown; msg?: unknown; error_description?: unknown };

async function requestSession(url: string, email: string, password: string, failure: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error("Нет соединения с сервером. Проверьте интернет и попробуйте снова.");
  }

  const data = (await response.json().catch(() => null)) as AuthBody | null;
  if (!response.ok || typeof data?.access_token !== "string") throw new Error(failure);
  return data.access_token;
}

export function signIn(email: string, password: string) {
  return requestSession(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    email,
    password,
    "Неверный email или пароль.",
  );
}

export function signUp(email: string, password: string) {
  return requestSession(
    `${SUPABASE_URL}/auth/v1/signup`,
    email,
    password,
    "Не удалось создать аккаунт. Возможно, он уже существует.",
  );
}

async function callAdmin(
  accessToken: string,
  action: "list" | "complete" | "cancel" | "ban" | "unban" | "hide-player" | "showcase-create" | "showcase-list-products" | "showcase-delete" | "showcase-purchases" | "notifications" | "notification-read",
  ticketId?: string,
  playerToken?: string,
  extra?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(ADMIN_FUNCTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Apikey: ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, ticketId, playerToken, ...extra }),
    });
  } catch {
    throw new Error("Нет соединения с сервером. Проверьте интернет и попробуйте снова.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new AdminAuthError("Войдите в аккаунт администратора заново.");
  }
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : null;
    throw new Error(message ?? "Не удалось выполнить действие. Попробуйте еще раз.");
  }
  if (!data) throw new Error(UNEXPECTED_RESPONSE);
  return data;
}

export async function fetchAllTickets(accessToken: string): Promise<DealTicket[]> {
  const data = await callAdmin(accessToken, "list");
  if (!Array.isArray(data.tickets)) throw new Error(UNEXPECTED_RESPONSE);
  return data.tickets as DealTicket[];
}

export async function completeTicket(accessToken: string, ticketId: string) {
  await callAdmin(accessToken, "complete", ticketId);
}

export async function cancelTicket(accessToken: string, ticketId: string) {
  await callAdmin(accessToken, "cancel", ticketId);
}

export async function banPlayer(accessToken: string, ticketId: string) {
  await callAdmin(accessToken, "ban", ticketId);
}

export async function unbanPlayer(accessToken: string, ticketId: string) {
  await callAdmin(accessToken, "unban", ticketId);
}

export async function hideAdminPlayer(accessToken: string, playerToken: string) {
  await callAdmin(accessToken, "hide-player", undefined, playerToken);
}

export type ShowcaseAdminProduct = {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  type: string;
  is_active: boolean;
  created_at: string;
};

export async function createShowcaseProduct(
  accessToken: string,
  input: { title: string; price: number; image_url: string | null; type: string },
): Promise<ShowcaseAdminProduct> {
  const data = await callAdmin(accessToken, "showcase-create", undefined, undefined, input);
  if (!data.product) throw new Error(UNEXPECTED_RESPONSE);
  return data.product as ShowcaseAdminProduct;
}

export async function fetchShowcaseProducts(accessToken: string): Promise<ShowcaseAdminProduct[]> {
  const data = await callAdmin(accessToken, "showcase-list-products");
  if (!Array.isArray(data.products)) throw new Error(UNEXPECTED_RESPONSE);
  return data.products as ShowcaseAdminProduct[];
}

export async function deleteShowcaseProduct(accessToken: string, productId: string) {
  await callAdmin(accessToken, "showcase-delete", undefined, undefined, { productId });
}

export type ShowcasePurchase = {
  id: string;
  product_id: string;
  player_id: string;
  nickname: string | null;
  telegram: string | null;
  price: number;
  status: string;
  created_at: string;
};

export async function fetchShowcasePurchases(accessToken: string): Promise<ShowcasePurchase[]> {
  const data = await callAdmin(accessToken, "showcase-purchases");
  if (!Array.isArray(data.purchases)) throw new Error(UNEXPECTED_RESPONSE);
  return data.purchases as ShowcasePurchase[];
}

export type AdminNotification = {
  id: string;
  kind: string;
  message: string;
  player_nickname: string | null;
  product_title: string | null;
  is_read: boolean;
  created_at: string;
};

export async function fetchAdminNotifications(accessToken: string): Promise<AdminNotification[]> {
  const data = await callAdmin(accessToken, "notifications");
  if (!Array.isArray(data.notifications)) throw new Error(UNEXPECTED_RESPONSE);
  return data.notifications as AdminNotification[];
}

export async function markNotificationRead(accessToken: string, notificationId: string) {
  await callAdmin(accessToken, "notification-read", undefined, undefined, { notificationId });
}
