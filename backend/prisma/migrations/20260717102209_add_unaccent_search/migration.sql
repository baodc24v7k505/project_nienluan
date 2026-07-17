-- Accent-insensitive search: lets users type "ao thun" and still match "Áo thun".
-- Split into its own migration/transaction — objects the extension creates (like its
-- text search dictionary) aren't reliably visible to regdictionary/catalog lookups
-- performed later in the SAME transaction, so the function that depends on it lives
-- in the next migration instead.
CREATE EXTENSION IF NOT EXISTS unaccent;
