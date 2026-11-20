import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_EMAIL = "leftyk200@gmail.com";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TICKET_LIST_LIMIT = 200;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

class BadRequest extends Error {}

type TicketRow = {
  id: string;
  player_id: string;
  kind: "withdraw" | "deposit";
  amount: number;
  status: string;
  held_items: Record<string, unknown>[];
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request) {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || ADMIN_EMAIL.length === 0) return false;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return false;
  return data.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

async function handleList() {
  const { data, error } = await supabase
    .from("deal_tickets")
    .select("id, number, kind, currency, nickname, location, telegram, phone, bank, deal_time, amount, rub_amount, status, is_premium, created_at")
    .order("created_at", { ascending: false })
    .limit(TICKET_LIST_LIMIT);
  if (error) throw error;
  return json({ tickets: data });
}

async function claimTicket(ticketId: string, nextStatus: "completed" | "rejected") {
  const { data, error } = await supabase
    .from("deal_tickets")
    .update({ status: nextStatus })
    .eq("id", ticketId)
    .eq("status", "in_progress")
    .select("id, player_id, kind, amount, status, held_items")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new BadRequest("Тикет уже закрыт или не найден.");
  return data as TicketRow;
}

async function creditDeposit(ticket: TicketRow) {
  const { data: player, error: loadError } = await supabase
    .from("players")
    .select("gold")
    .eq("id", ticket.player_id)
    .single();
  if (loadError) throw loadError;

  const { error } = await supabase
    .from("players")
    .update({ gold: Math.round((player.gold + ticket.amount) * 100) / 100 })
    .eq("id", ticket.player_id);
  if (error) throw error;

  const { error: statsError } = await supabase.rpc("add_player_deposit", {
    p_player_id: ticket.player_id,
    p_amount: ticket.amount,
  });
  if (statsError) throw statsError;
}

async function restoreHeldItems(ticket: TicketRow) {
  if (ticket.held_items.length === 0) return;
  const { error } = await supabase
    .from("loot_items")
    .upsert(ticket.held_items, { onConflict: "id" });
  if (error) throw error;
}

async function handleComplete(ticketId: string) {
  const ticket = await claimTicket(ticketId, "completed");
  if (ticket.kind === "deposit") await creditDeposit(ticket);
  return json({ ok: true });
}

async function handleBan(ticketId: string) {
  const { data: ticket, error: lookupError } = await supabase
    .from("deal_tickets")
    .select("id, player_id")
    .eq("id", ticketId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!ticket) throw new BadRequest("Тикет не найден.");

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, device_id")
    .eq("id", ticket.player_id)
    .maybeSingle();
  if (playerError) throw playerError;
  if (!player) throw new BadRequest("Игрок не найден.");

  const { error: banError } = await supabase
    .from("players")
    .update({ is_banned: true })
    .eq("id", ticket.player_id);
  if (banError) throw banError;

  if (player.device_id) {
    const { error: deviceBanError } = await supabase
      .from("players")
      .update({ is_banned: true })
      .eq("device_id", player.device_id);
    if (deviceBanError) throw deviceBanError;
  }

  const { data: openTickets, error: ticketsError } = await supabase
    .from("deal_tickets")
    .select("id, kind, held_items")
    .eq("player_id", ticket.player_id)
    .eq("status", "in_progress");
  if (ticketsError) throw ticketsError;

  if (openTickets && openTickets.length > 0) {
    const { error: rejectError } = await supabase
      .from("deal_tickets")
      .update({ status: "rejected" })
      .in("id", openTickets.map((t) => t.id));
    if (rejectError) throw rejectError;

    for (const t of openTickets) {
      if (t.kind === "withdraw" && Array.isArray(t.held_items) && t.held_items.length > 0) {
        const { error: restoreError } = await supabase
          .from("loot_items")
          .upsert(t.held_items, { onConflict: "id" });
        if (restoreError) throw restoreError;
      }
    }
  }

  return json({ ok: true });
}

async function handleCancel(ticketId: string) {
  const ticket = await claimTicket(ticketId, "rejected");
  if (ticket.kind === "withdraw") await restoreHeldItems(ticket);
  return json({ ok: true });
}

async function handleHidePlayer(playerToken: unknown) {
  if (typeof playerToken !== "string" || !UUID_PATTERN.test(playerToken)) {
    throw new BadRequest("Некорректный игрок.");
  }
  const { error } = await supabase
    .from("players")
    .update({ is_admin: true })
    .eq("token", playerToken);
  if (error) throw error;
  return json({ ok: true });
}

async function handleUnban(ticketId: string) {
  const { data: ticket, error: lookupError } = await supabase
    .from("deal_tickets")
    .select("id, player_id")
    .eq("id", ticketId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!ticket) throw new BadRequest("Тикет не найден.");

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, device_id")
    .eq("id", ticket.player_id)
    .maybeSingle();
  if (playerError) throw playerError;
  if (!player) throw new BadRequest("Игрок не найден.");

  const { error: unbanError } = await supabase
    .from("players")
    .update({ is_banned: false })
    .eq("id", ticket.player_id);
  if (unbanError) throw unbanError;

  if (player.device_id) {
    const { error: deviceUnbanError } = await supabase
      .from("players")
      .update({ is_banned: false })
      .eq("device_id", player.device_id);
    if (deviceUnbanError) throw deviceUnbanError;
  }

  return json({ ok: true });
}

function parseRequiredText(value: unknown, maxLen: number, label: string): string {
  if (typeof value !== "string") throw new BadRequest(label);
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLen) throw new BadRequest(label);
  return trimmed;
}

async function handleShowcaseCreate(body: Record<string, unknown>) {
  const title = parseRequiredText(body.title, 100, "Укажите название товара (до 100 символов).");
  const type = body.type === "in-game" ? "in-game" : "external";
  const price = typeof body.price === "number" && body.price >= 0 ? body.price : null;
  if (price === null) throw new BadRequest("Укажите корректную цену (неотрицательное число).");
  const imageUrl = typeof body.image_url === "string" && body.image_url.trim().length > 0
    ? body.image_url.trim()
    : null;

  const { data, error } = await supabase
    .from("showcase_products")
    .insert({ title, price, image_url: imageUrl, type, is_active: true })
    .select("id, title, price, image_url, type, is_active, created_at")
    .single();
  if (error) throw error;
  return json({ product: data });
}

async function handleShowcaseListProducts() {
  const { data, error } = await supabase
    .from("showcase_products")
    .select("id, title, price, image_url, type, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return json({ products: data ?? [] });
}

async function handleShowcaseDelete(body: Record<string, unknown>) {
  if (typeof body.productId !== "string" || !UUID_PATTERN.test(body.productId)) {
    throw new BadRequest("Некорректный товар.");
  }
  const { error } = await supabase
    .from("showcase_products")
    .update({ is_active: false })
    .eq("id", body.productId);
  if (error) throw error;
  return json({ ok: true });
}

async function handleShowcasePurchases() {
  const { data, error } = await supabase
    .from("showcase_purchases")
    .select("id, product_id, player_id, nickname, telegram, price, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return json({ purchases: data ?? [] });
}

async function handleNotifications() {
  const { data, error } = await supabase
    .from("admin_notifications")
    .select("id, kind, message, player_nickname, product_title, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return json({ notifications: data ?? [] });
}

async function handleNotificationRead(body: Record<string, unknown>) {
  if (typeof body.notificationId !== "string" || !UUID_PATTERN.test(body.notificationId)) {
    throw new BadRequest("Некорректное оповещение.");
  }
  const { error } = await supabase
    .from("admin_notifications")
    .update({ is_read: true })
    .eq("id", body.notificationId);
  if (error) throw error;
  return json({ ok: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!(await requireAdmin(req))) {
      return json({ error: "Доступ запрещен." }, 403);
    }

    const body = (await req.json()) as Record<string, unknown>;
    if (body.action === "list") return await handleList();
    if (body.action === "hide-player") return await handleHidePlayer(body.playerToken);
    if (body.action === "showcase-create") return await handleShowcaseCreate(body);
    if (body.action === "showcase-list-products") return await handleShowcaseListProducts();
    if (body.action === "showcase-delete") return await handleShowcaseDelete(body);
    if (body.action === "showcase-purchases") return await handleShowcasePurchases();
    if (body.action === "notifications") return await handleNotifications();
    if (body.action === "notification-read") return await handleNotificationRead(body);

    if (typeof body.ticketId !== "string" || !UUID_PATTERN.test(body.ticketId)) {
      throw new BadRequest("Некорректный тикет.");
    }
    if (body.action === "complete") return await handleComplete(body.ticketId);
    if (body.action === "cancel") return await handleCancel(body.ticketId);
    if (body.action === "ban") return await handleBan(body.ticketId);
    if (body.action === "unban") return await handleUnban(body.ticketId);
    return json({ error: "Неизвестное действие." }, 400);
  } catch (err) {
    if (err instanceof BadRequest) {
      return json({ error: err.message }, 400);
    }
    console.error(err);
    return json({ error: "Что-то пошло не так. Попробуйте еще раз." }, 500);
  }
});
