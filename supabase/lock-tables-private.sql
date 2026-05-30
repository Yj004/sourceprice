-- ============================================================
-- Lock sourcePrice tables — NOT publicly accessible
-- Run in: Supabase Dashboard → SQL Editor
--
-- Effect:
--   • Removes any open "dev" RLS policies
--   • Enables RLS with NO permissive policies (deny all via API)
--   • Revokes table/view/function access from `anon` and `PUBLIC`
--   • Only `service_role` (server-side) bypasses RLS — never put that in the browser
--
-- After this, the React app cannot read/write tables with the anon key.
-- Use a backend or Supabase Edge Function with service_role, or Supabase Auth
-- with explicit `authenticated` policies (see bottom, commented).
-- ============================================================

-- ---------- 1) Drop permissive dev policies (if you ran the earlier script) ----------
DROP POLICY IF EXISTS "dev_allowed_users_all" ON public.allowed_users;
DROP POLICY IF EXISTS "dev_products_all" ON public.products;
DROP POLICY IF EXISTS "dev_price_history_all" ON public.price_history;

DROP POLICY IF EXISTS "dev_all_allowed_users" ON public.allowed_users;
DROP POLICY IF EXISTS "dev_all_products" ON public.products;
DROP POLICY IF EXISTS "dev_all_price_history" ON public.price_history;

-- ---------- 2) RLS on — no open policies = deny for anon/authenticated ----------
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.allowed_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;
ALTER TABLE public.price_history FORCE ROW LEVEL SECURITY;

-- ---------- 3) Revoke API access from anonymous / public roles ----------
REVOKE ALL ON TABLE public.allowed_users FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.products FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.price_history FROM anon, authenticated, PUBLIC;

REVOKE ALL ON public.products_api FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.price_history_api FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.verify_allowed_user(TEXT, TEXT) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_product_price(BIGINT, NUMERIC, TEXT) FROM anon, authenticated, PUBLIC;

-- ---------- 4) Optional: restrict views to service_role only ----------
-- (Views inherit underlying table RLS in many setups; revoking anon is the important part.)

-- ============================================================
-- OPTIONAL — only if you switch to Supabase Auth (JWT login)
-- Uncomment and run AFTER enabling Auth in the dashboard.
-- Still NOT public: only logged-in `authenticated` users.
-- ============================================================
/*
CREATE POLICY "auth_read_products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "auth_update_products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "auth_read_history"
  ON public.price_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "auth_insert_history"
  ON public.price_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

GRANT SELECT, UPDATE ON public.products TO authenticated;
GRANT SELECT, INSERT ON public.price_history TO authenticated;
*/
