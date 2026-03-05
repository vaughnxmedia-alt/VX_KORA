-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to all roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Drop and recreate citext extension in extensions schema
-- Note: This will fail if any columns use citext type
DROP EXTENSION IF EXISTS citext CASCADE;
CREATE EXTENSION citext WITH SCHEMA extensions;