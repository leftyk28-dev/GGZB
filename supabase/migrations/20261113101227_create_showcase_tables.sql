/*
# Showcase (storefront) tables

1. New Tables
- `showcase_products`: items published by the admin for players to buy.
  - id (uuid, pk)
  - title (text, not null): product name shown to players.
  - price (numeric, not null, >= 0): cost in gold.
  - image_url (text, nullable): public image URL for the product.
  - type (text, not null): 'in-game' or 'external'. Determines which fields the buyer must fill.
  - is_active (boolean, default true): soft-delete / hide.
  - created_at (timestamptz, default now())
- `showcase_purchases`: record of each purchase.
  - id (uuid, pk)
  - product_id (uuid, fk to showcase_products)
  - player_id (uuid, fk to players)
  - nickname (text, nullable): in-game nick provided by buyer (in-game type only)
  - telegram (text, nullable): buyer's Telegram username
  - price (numeric): snapshot of price at purchase time
  - status (text, default 'pending'): 'pending' | 'fulfilled' | 'cancelled'
  - created_at (timestamptz, default now())
- `admin_notifications`: messages to the admin (e.g. "player X bought product Y").
  - id (uuid, pk)
  - kind (text, not null): e.g. 'showcase-purchase'
  - message (text, not null): human-readable text
  - player_nickname (text, nullable)
  - product_title (text, nullable)
  - is_read (boolean, default false)
  - created_at (timestamptz, default now())

2. Security
- RLS enabled on all three tables.
- showcase_products: read by anon+authenticated (players see the storefront); writes only via service_role (admin edge function).
- showcase_purchases: INSERT/SELECT by anon+authenticated (players create their own purchases and read list); service_role for admin.
- admin_notifications: only service_role (admin edge function) reads and writes. No anon/authenticated access.

3. Important Notes
- Product images are stored as public URLs (Supabase Storage public bucket). The admin uploads via the admin edge function.
- No user_id / auth.uid() columns — this game uses custom token-based player identity, not Supabase Auth, for players.
*/

CREATE TABLE IF NOT EXISTS showcase_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  image_url text,
  type text NOT NULL DEFAULT 'external' CHECK (type IN ('in-game', 'external')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS showcase_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES showcase_products(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  nickname text,
  telegram text,
  price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  message text NOT NULL,
  player_nickname text,
  product_title text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE showcase_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON showcase_products TO anon, authenticated;
GRANT SELECT, INSERT ON showcase_purchases TO anon, authenticated;
GRANT ALL ON showcase_products, showcase_purchases, admin_notifications TO service_role;

DROP POLICY IF EXISTS "anon_select_showcase_products" ON showcase_products;
CREATE POLICY "anon_select_showcase_products" ON showcase_products FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_showcase_purchases" ON showcase_purchases;
CREATE POLICY "anon_insert_showcase_purchases" ON showcase_purchases FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_showcase_purchases" ON showcase_purchases;
CREATE POLICY "anon_select_showcase_purchases" ON showcase_purchases FOR SELECT
TO anon, authenticated USING (true);
