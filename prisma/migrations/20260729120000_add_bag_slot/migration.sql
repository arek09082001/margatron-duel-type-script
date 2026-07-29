-- Bags. The equipment set gained a fourth slot that widens the backpack
-- instead of feeding a combat stat.
--
-- Only the default and the existing rows need touching: `equipped` is JSONB,
-- and the inventory column already stores a variable-length array.

ALTER TABLE "game_profiles"
    ALTER COLUMN "equipped" SET DEFAULT '{"weapon":null,"armor":null,"accessory":null,"bag":null}';

-- `-> 'bag'` is SQL NULL only when the key is missing, so a profile that
-- already carries the slot is left alone.
UPDATE "game_profiles"
SET "equipped" = "equipped" || '{"bag":null}'::jsonb
WHERE "equipped" -> 'bag' IS NULL;
