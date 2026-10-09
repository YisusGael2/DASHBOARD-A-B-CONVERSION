-- Install as the migration owner (postgres), never as dashboard_app.
-- dashboard_app must already exist with NOSUPERUSER NOBYPASSRLS NOINHERIT.
-- Runtime identity comes exclusively from trusted backend SET LOCAL settings.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolsuper) THEN
    RAISE EXCEPTION 'Run schema installation with the privileged migration account, not the runtime account';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dashboard_app') THEN
    RAISE EXCEPTION 'Create the dashboard_app runtime role before schema installation';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dashboard_app' AND (rolsuper OR rolbypassrls)) THEN
    RAISE EXCEPTION 'dashboard_app must have NOSUPERUSER NOBYPASSRLS';
  END IF;
END
$$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM dashboard_app;
GRANT USAGE ON SCHEMA public TO dashboard_app;

CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  domain text NOT NULL UNIQUE CHECK (domain = lower(domain)),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  currency char(3) NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'CLIENT')),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  email text NOT NULL UNIQUE CHECK (email = lower(btrim(email))),
  password_hash text NOT NULL CHECK (password_hash LIKE '$argon2id$%'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_role_store_check CHECK (
    (role = 'CLIENT' AND store_id IS NOT NULL)
    OR (role IN ('ADMIN', 'SUPER_ADMIN') AND store_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS users_store_id_idx ON public.users(store_id);

CREATE TABLE IF NOT EXISTS public.api_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider IN ('shopify', 'clarity', 'intelligems')),
  status text NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'demo', 'credential_saved', 'connected', 'error')),
  external_id text,
  scopes text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, provider),
  UNIQUE (id, store_id)
);
ALTER TABLE public.api_integrations DROP CONSTRAINT IF EXISTS api_integrations_status_check;
ALTER TABLE public.api_integrations ADD CONSTRAINT api_integrations_status_check
  CHECK (status IN ('disconnected', 'demo', 'credential_saved', 'connected', 'error'));

-- This table is inaccessible through direct runtime queries, including staff.
-- Ciphertext is an authenticated encrypted envelope produced by the backend.
CREATE TABLE IF NOT EXISTS public.integration_credentials (
  integration_id uuid PRIMARY KEY,
  store_id uuid NOT NULL,
  ciphertext text NOT NULL CHECK (length(ciphertext) > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (integration_id, store_id)
    REFERENCES public.api_integrations(id, store_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS integration_credentials_store_id_idx
  ON public.integration_credentials(store_id);

CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  date date NOT NULL,
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  revenue numeric(18,2) NOT NULL DEFAULT 0,
  orders integer NOT NULL DEFAULT 0 CHECK (orders >= 0),
  sessions integer CHECK (sessions >= 0),
  conversion_rate numeric(9,6) CHECK (conversion_rate BETWEEN 0 AND 1),
  source text NOT NULL DEFAULT 'shopify' CHECK (source IN ('demo', 'shopify')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, date, currency, source)
);
COMMENT ON COLUMN public.daily_metrics.revenue IS
  'Shopify sum of currentTotalPriceSet.shopMoney for non-test, non-cancelled orders grouped by order creation date; includes shipping/taxes and adjusted totals. Not accounting net sales. Demo values are synthetic.';
COMMENT ON COLUMN public.daily_metrics.sessions IS
  'Nullable: missing sessions are unavailable, not zero. Orders alone do not establish conversion.';
COMMENT ON COLUMN public.daily_metrics.conversion_rate IS
  'Optional provider-defined purchasing sessions / eligible sessions, expressed as a fraction. Never infer from unrelated sources.';

CREATE TABLE IF NOT EXISTS public.experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  external_id text,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  started_at timestamptz,
  ended_at timestamptz,
  source text NOT NULL DEFAULT 'intelligems' CHECK (source IN ('demo', 'intelligems')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at),
  UNIQUE (id, store_id),
  UNIQUE (store_id, source, external_id)
);
CREATE INDEX IF NOT EXISTS experiments_store_id_status_idx
  ON public.experiments(store_id, status);

CREATE TABLE IF NOT EXISTS public.experiment_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  experiment_id uuid NOT NULL,
  external_id text,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  is_control boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (experiment_id, store_id)
    REFERENCES public.experiments(id, store_id) ON DELETE CASCADE,
  UNIQUE (id, store_id),
  UNIQUE (experiment_id, external_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS experiment_variants_single_control_idx
  ON public.experiment_variants(experiment_id) WHERE is_control;
CREATE INDEX IF NOT EXISTS experiment_variants_store_id_idx
  ON public.experiment_variants(store_id);

CREATE TABLE IF NOT EXISTS public.variant_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  date date NOT NULL,
  visitors integer NOT NULL DEFAULT 0 CHECK (visitors >= 0),
  orders integer NOT NULL DEFAULT 0 CHECK (orders >= 0),
  revenue numeric(18,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  source text NOT NULL DEFAULT 'intelligems' CHECK (source IN ('demo', 'intelligems')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (variant_id, store_id)
    REFERENCES public.experiment_variants(id, store_id) ON DELETE CASCADE,
  UNIQUE (variant_id, date, currency, source)
);
CREATE INDEX IF NOT EXISTS variant_metrics_store_id_date_idx
  ON public.variant_metrics(store_id, date);

CREATE TABLE IF NOT EXISTS public.clarity_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  date date NOT NULL,
  sessions integer CHECK (sessions >= 0),
  dead_clicks integer CHECK (dead_clicks >= 0),
  rage_clicks integer CHECK (rage_clicks >= 0),
  quick_backs integer CHECK (quick_backs >= 0),
  scroll_depth numeric(5,2) CHECK (scroll_depth BETWEEN 0 AND 100),
  source text NOT NULL DEFAULT 'clarity' CHECK (source IN ('demo', 'clarity')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, date, source)
);
COMMENT ON TABLE public.clarity_metrics IS
  'Store-level behavior only. Attribution to experiment variants requires explicit, verified instrumentation.';

CREATE TABLE IF NOT EXISTS public.sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  integration_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  error text,
  records_processed integer NOT NULL DEFAULT 0 CHECK (records_processed >= 0),
  FOREIGN KEY (integration_id, store_id)
    REFERENCES public.api_integrations(id, store_id) ON DELETE CASCADE,
  CHECK (finished_at IS NULL OR finished_at >= started_at)
);
CREATE INDEX IF NOT EXISTS sync_runs_store_id_started_at_idx
  ON public.sync_runs(store_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE RESTRICT,
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (length(btrim(action)) > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_store_id_created_at_idx
  ON public.audit_events(store_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.app_is_staff() RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog, public, pg_temp
AS $$ SELECT COALESCE(current_setting('app.role', true) IN ('ADMIN', 'SUPER_ADMIN'), false) $$;

CREATE OR REPLACE FUNCTION public.app_store_visible(target_store_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT public.app_is_staff() OR (
    current_setting('app.role', true) = 'CLIENT'
    AND target_store_id = nullif(current_setting('app.store_id', true), '')::uuid
  )
$$;

-- The pool never authenticates using a tenant query or an unverified JWT role.
-- These fixed SQL functions run under the migration owner, bypass FORCE RLS,
-- and cannot be used by clients directly: PostgreSQL is backend-private.
CREATE OR REPLACE FUNCTION public.auth_lookup(lookup_email text)
RETURNS SETOF public.users
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$ SELECT u.* FROM public.users AS u WHERE u.email = lower(btrim(lookup_email)) $$;

CREATE OR REPLACE FUNCTION public.auth_user(lookup_id uuid)
RETURNS SETOF public.users
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$ SELECT u.* FROM public.users AS u WHERE u.id = lookup_id $$;

CREATE OR REPLACE FUNCTION public.store_credential(target_integration_id uuid, encrypted_value text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE target_store_id uuid;
BEGIN
  IF NOT public.app_is_staff() THEN
    RAISE EXCEPTION 'Only agency staff can manage integration credentials' USING ERRCODE = '42501';
  END IF;
  IF encrypted_value IS NULL OR length(encrypted_value) = 0 THEN
    RAISE EXCEPTION 'An encrypted credential envelope is required' USING ERRCODE = '22023';
  END IF;
  SELECT store_id INTO target_store_id FROM public.api_integrations WHERE id = target_integration_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Integration not found' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.integration_credentials (integration_id, store_id, ciphertext)
    VALUES (target_integration_id, target_store_id, encrypted_value)
    ON CONFLICT (integration_id) DO UPDATE SET
      ciphertext = EXCLUDED.ciphertext, updated_at = now();
END
$$;

CREATE OR REPLACE FUNCTION public.read_credential(target_integration_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE encrypted_value text;
BEGIN
  IF NOT public.app_is_staff() THEN
    RAISE EXCEPTION 'Only agency staff can use integration credentials' USING ERRCODE = '42501';
  END IF;
  SELECT ciphertext INTO encrypted_value FROM public.integration_credentials
    WHERE integration_id = target_integration_id;
  RETURN encrypted_value;
END
$$;

-- Every tenant table is covered. Missing context provides no tenant access.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'stores', 'users', 'api_integrations', 'integration_credentials',
    'daily_metrics', 'experiments', 'experiment_variants', 'variant_metrics',
    'clarity_metrics', 'sync_runs', 'audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
  END LOOP;
END
$$;

DROP POLICY IF EXISTS stores_read ON public.stores;
CREATE POLICY stores_read ON public.stores FOR SELECT TO dashboard_app
  USING (public.app_store_visible(id));
DROP POLICY IF EXISTS stores_write ON public.stores;
CREATE POLICY stores_write ON public.stores FOR ALL TO dashboard_app
  USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

DROP POLICY IF EXISTS users_read ON public.users;
CREATE POLICY users_read ON public.users FOR SELECT TO dashboard_app
  USING (public.app_is_staff() OR id = nullif(current_setting('app.user_id', true), '')::uuid);
DROP POLICY IF EXISTS users_write ON public.users;
CREATE POLICY users_write ON public.users FOR ALL TO dashboard_app
  USING (
    current_setting('app.role', true) = 'SUPER_ADMIN'
    OR (current_setting('app.role', true) = 'ADMIN' AND role = 'CLIENT')
  ) WITH CHECK (
    current_setting('app.role', true) = 'SUPER_ADMIN'
    OR (current_setting('app.role', true) = 'ADMIN' AND role = 'CLIENT')
  );

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'api_integrations', 'daily_metrics', 'experiments', 'experiment_variants',
    'variant_metrics', 'clarity_metrics', 'sync_runs'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_read ON public.%I', table_name);
    EXECUTE format('CREATE POLICY tenant_read ON public.%I FOR SELECT TO dashboard_app USING (public.app_store_visible(store_id))', table_name);
    EXECUTE format('DROP POLICY IF EXISTS staff_write ON public.%I', table_name);
    EXECUTE format('CREATE POLICY staff_write ON public.%I FOR ALL TO dashboard_app USING (public.app_is_staff()) WITH CHECK (public.app_is_staff())', table_name);
  END LOOP;
END
$$;

-- No credential-table policy and no direct grants: only guarded definer calls.
DROP POLICY IF EXISTS audit_read ON public.audit_events;
CREATE POLICY audit_read ON public.audit_events FOR SELECT TO dashboard_app
  USING (public.app_is_staff());
DROP POLICY IF EXISTS audit_insert ON public.audit_events;
CREATE POLICY audit_insert ON public.audit_events FOR INSERT TO dashboard_app
  WITH CHECK (
    public.app_is_staff()
    AND actor_user_id = nullif(current_setting('app.user_id', true), '')::uuid
  );

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM dashboard_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores, public.users,
  public.api_integrations, public.daily_metrics, public.experiments,
  public.experiment_variants, public.variant_metrics, public.clarity_metrics,
  public.sync_runs TO dashboard_app;
-- Password hashes are only available through the private authentication path.
REVOKE SELECT ON public.users FROM dashboard_app;
GRANT SELECT (id, store_id, role, name, email, status, created_at, updated_at)
  ON public.users TO dashboard_app;
GRANT SELECT, INSERT ON public.audit_events TO dashboard_app;
REVOKE ALL ON public.integration_credentials FROM PUBLIC, dashboard_app;

REVOKE ALL ON FUNCTION public.app_is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_store_visible(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_lookup(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.store_credential(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.read_credential(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_is_staff(), public.app_store_visible(uuid),
  public.auth_lookup(text), public.auth_user(uuid),
  public.store_credential(uuid, text), public.read_credential(uuid) TO dashboard_app;

COMMIT;
