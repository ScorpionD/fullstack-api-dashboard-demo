CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, email text UNIQUE NOT NULL, name text NOT NULL,
 password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('admin','user'))
);
CREATE TABLE IF NOT EXISTS workspaces (id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours');
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, csrf_token text NOT NULL, expires_at timestamptz NOT NULL DEFAULT now()+interval '8 hours');
CREATE TABLE IF NOT EXISTS customers (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(name) BETWEEN 2 AND 80), email text NOT NULL CHECK(length(email)<=160),
 company text NOT NULL CHECK(length(company) BETWEEN 2 AND 100), status text NOT NULL CHECK(status IN ('active','inactive')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(workspace_id,email), UNIQUE(workspace_id,id)
);
CREATE TABLE IF NOT EXISTS orders (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL, reference text NOT NULL, description text NOT NULL CHECK(length(description) BETWEEN 2 AND 120),
 amount_cents integer NOT NULL CHECK(amount_cents BETWEEN 1 AND 100000000),
 status text NOT NULL CHECK(status IN ('pending','processing','completed','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(workspace_id,customer_id) REFERENCES customers(workspace_id,id), UNIQUE(workspace_id,reference)
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id bigserial PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id), action text NOT NULL CHECK(action IN ('create','update','delete')),
 entity text NOT NULL CHECK(entity IN ('customer','order')), entity_id uuid NOT NULL,
 summary text NOT NULL, before_data jsonb, after_data jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customers_workspace_idx ON customers(workspace_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS orders_workspace_idx ON orders(workspace_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS audit_workspace_idx ON audit_logs(workspace_id,id DESC);
CREATE INDEX IF NOT EXISTS workspace_expiry_idx ON workspaces(expires_at);
INSERT INTO schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
