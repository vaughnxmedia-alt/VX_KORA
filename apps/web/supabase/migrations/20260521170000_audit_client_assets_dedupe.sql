-- Prevent duplicate Asset Library rows for the same physical file per audit.
CREATE UNIQUE INDEX IF NOT EXISTS audit_client_assets_audit_storage_path_key
  ON public.audit_client_assets (audit_id, storage_path);
