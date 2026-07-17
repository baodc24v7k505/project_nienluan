-- unaccent() is STABLE, not IMMUTABLE, so it cannot be used directly inside an index.
-- Wrap it in an IMMUTABLE function (safe here: the "unaccent" text search dictionary
-- is a static asset, not session-dependent) so it can back a functional GIN index.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent($1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- Replace the accent-sensitive trigram index with an accent-insensitive one
DROP INDEX IF EXISTS "products_name_trgm_idx";
CREATE INDEX IF NOT EXISTS "products_name_unaccent_trgm_idx"
  ON "products" USING GIN (immutable_unaccent("name") gin_trgm_ops);
