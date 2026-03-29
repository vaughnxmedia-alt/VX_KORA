-- Encrypted API keys per tenant for social integrations (server-side encryption via Edge Function).
-- Clients read only non-secret metadata via RPC; ciphertext never exposed to authenticated role.

CREATE TABLE IF NOT EXISTS integration_api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  provider TEXT NOT NULL,
  credential_kind TEXT NOT NULL DEFAULT 'api_key',
  encrypted_payload TEXT NOT NULL,
  key_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integration_api_credentials_tenant_id
  ON integration_api_credentials (tenant_id);

CREATE TRIGGER update_integration_api_credentials_updated_at
  BEFORE UPDATE ON integration_api_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE integration_api_credentials ENABLE ROW LEVEL SECURITY;

-- No direct access for authenticated (secrets stay server-only; Edge uses service role).
REVOKE ALL ON integration_api_credentials FROM PUBLIC;
REVOKE ALL ON integration_api_credentials FROM authenticated;
REVOKE ALL ON integration_api_credentials FROM anon;

-- Safe listing for signed-in users (same tenant only).
CREATE OR REPLACE FUNCTION public.list_integration_api_status()
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  provider TEXT,
  credential_kind TEXT,
  key_hint TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.id,
    c.tenant_id,
    c.provider,
    c.credential_kind,
    c.key_hint,
    c.updated_at
  FROM integration_api_credentials c
  WHERE c.tenant_id = get_user_tenant_id(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.list_integration_api_status() TO authenticated;
