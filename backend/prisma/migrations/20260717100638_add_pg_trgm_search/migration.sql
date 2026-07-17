-- Enable trigram similarity matching for fuzzy/typo-tolerant product search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Speed up ILIKE / similarity() lookups on product name
CREATE INDEX IF NOT EXISTS "products_name_trgm_idx" ON "products" USING GIN ("name" gin_trgm_ops);
