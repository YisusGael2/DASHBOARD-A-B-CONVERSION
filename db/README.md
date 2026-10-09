# PostgreSQL contract

`schema.sql` installs a database shared by one agency. Every store is a tenant.
Clients have exactly one store; agency admins and the super admin have none.
UUID generation uses PostgreSQL's built-in `gen_random_uuid()` (PostgreSQL 13+).

Run migrations and the demo seed with the privileged installation account.
`dashboard_app` is a separate login role with `NOSUPERUSER NOBYPASSRLS` and no
schema creation privilege. The application's `SUPER_ADMIN` role never creates
a PostgreSQL superuser. Do not expose PostgreSQL or its credentials to browsers.

For each authenticated request, retrieve the current user through
`auth_user(uuid)`, then begin a transaction on one checked-out pool connection:

```sql
BEGIN;
SELECT set_config('app.user_id', $1, true),
       set_config('app.role', $2, true),
       set_config('app.store_id', $3, true);
-- Run authorized queries using this same connection.
COMMIT;
```

The third argument makes settings local to the transaction. Roll back on
errors and release the connection in `finally`. All values must come from
verified server-side identity, never a role or store ID supplied by the client.
No context grants no tenant data. RLS is enabled and forced on every tenant
table; clients can only read their store and cannot write metrics.

The migration owner owns the fixed, `SECURITY DEFINER` functions. They use a
fixed search path and no dynamic SQL or user-selectable tables. `auth_lookup`
and `auth_user` return a user row for private backend authentication and current
permission checks; never serialize their password hash into an API response.
Regular runtime queries may select user columns excluding `password_hash`.
Use explicit columns instead of `SELECT *` or `RETURNING *` for user management.

`api_integrations` contains public integration metadata. Do not put credentials
into its `metadata` column. The separate `integration_credentials` table has no
direct runtime grants or RLS policies. Agency staff can use
`store_credential(integration_id, ciphertext)` and
`read_credential(integration_id)` only inside the verified request context.
The ciphertext is an authenticated encrypted envelope; its encryption key
belongs in the backend environment, outside this database. These functions
are for internal backend use; no credential read endpoint belongs in the API.

Composite foreign keys prevent variants, measurements, credentials, and sync
runs from referencing parents belonging to a different store. Unique keys
support idempotent importer upserts:

| Table | Conflict key |
| --- | --- |
| `api_integrations` | `store_id, provider` |
| `integration_credentials` | `integration_id` |
| `daily_metrics` | `store_id, date, currency, source` |
| `experiments` | `store_id, source, external_id` |
| `experiment_variants` | `experiment_id, external_id` |
| `variant_metrics` | `variant_id, date, currency, source` |
| `clarity_metrics` | `store_id, date, source` |

Demo metrics use `source = 'demo'` and demo integrations use `status = 'demo'`.
Live rows use their provider as source. Do not combine demo and live values in
one aggregate. Currency must also be preserved when aggregating revenue.
Missing sessions or conversion data are SQL `NULL`, not invented zero values.
Clarity data is store-level; it is not attributed to experiment variants.
Provider result details, including statistical confidence if available, can
be retained in experiment metadata without inferring a winner from observed
conversion rate alone.
