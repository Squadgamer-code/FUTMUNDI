-- FUTMUNDI Supabase grants fix
-- Ejecutar en Supabase SQL Editor si Render muestra:
-- "permission denied for table app_users"
--
-- Esto NO abre las tablas al público. Solo da permisos al rol service_role,
-- que debe usarse únicamente en Render/backend, nunca en el index.

BEGIN;

GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT EXECUTE ON FUNCTIONS TO service_role;

COMMIT;
