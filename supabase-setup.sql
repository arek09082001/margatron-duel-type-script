-- Margonem: Duel — one-shot Supabase setup.
--
-- Paste this whole file into the Supabase SQL Editor and run it. It creates the
-- schema and restores the characters that were played before the database
-- existed. Safe to re-run: tables are created only if missing and the seeded
-- rows are upserted.
--
-- Equivalent to:  npm run db:migrate && npm run db:seed

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE IF NOT EXISTS "players" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "nick" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "game_profiles" (
    "id" UUID NOT NULL,
    "nick" TEXT NOT NULL,
    "level" SMALLINT NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "exp_max" INTEGER NOT NULL DEFAULT 20,
    "gold" INTEGER NOT NULL DEFAULT 100,
    "pa" SMALLINT NOT NULL DEFAULT 20,
    "pa_max" SMALLINT NOT NULL DEFAULT 20,
    "pa_regenerated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "played_seconds" INTEGER NOT NULL DEFAULT 0,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vitality" SMALLINT NOT NULL DEFAULT 5,
    "strength" SMALLINT NOT NULL DEFAULT 5,
    "luck" SMALLINT NOT NULL DEFAULT 5,
    "vitality_points_assigned" SMALLINT NOT NULL DEFAULT 0,
    "strength_points_assigned" SMALLINT NOT NULL DEFAULT 0,
    "luck_points_assigned" SMALLINT NOT NULL DEFAULT 0,
    "attribute_points" SMALLINT NOT NULL DEFAULT 0,
    "hp" INTEGER NOT NULL DEFAULT 50,
    "dmg_min" INTEGER NOT NULL DEFAULT 1,
    "dmg_max" INTEGER NOT NULL DEFAULT 2,
    "armor" INTEGER NOT NULL DEFAULT 0,
    "crit_chance" INTEGER NOT NULL DEFAULT 5,
    "crit_power" INTEGER NOT NULL DEFAULT 150,
    "dodge" INTEGER NOT NULL DEFAULT 3,
    "stun" INTEGER NOT NULL DEFAULT 0,
    "monsters_killed" INTEGER NOT NULL DEFAULT 0,
    "unique_items_found" INTEGER NOT NULL DEFAULT 0,
    "heroic_items_found" INTEGER NOT NULL DEFAULT 0,
    "legendary_items_found" INTEGER NOT NULL DEFAULT 0,
    "current_map_id" SMALLINT NOT NULL DEFAULT 1,
    "rest_tasks" JSONB NOT NULL DEFAULT '{}',
    "stage_progress" JSONB NOT NULL DEFAULT '{}',
    "inventory" JSONB NOT NULL DEFAULT '[]',
    "equipped" JSONB NOT NULL DEFAULT '{"weapon":null,"armor":null,"accessory":null,"bag":null}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "game_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "players_email_key" ON "players"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "players_nick_key" ON "players"("nick");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "game_profiles_nick_key" ON "game_profiles"("nick");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "game_profiles_ranking_idx" ON "game_profiles"("level" DESC, "exp" DESC);

-- AddForeignKey (guarded so the whole file can be re-run)
DO $$
BEGIN
    ALTER TABLE "game_profiles"
        ADD CONSTRAINT "game_profiles_id_fkey"
        FOREIGN KEY ("id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Bags (only does anything on a database created before they existed):
-- the equipment set gained a `bag` slot that widens the backpack.
ALTER TABLE "game_profiles"
    ALTER COLUMN "equipped" SET DEFAULT '{"weapon":null,"armor":null,"accessory":null,"bag":null}';

-- `-> 'bag'` is SQL NULL only when the key is missing, so a profile that
-- already carries the slot is left alone.
UPDATE "game_profiles"
SET "equipped" = "equipped" || '{"bag":null}'::jsonb
WHERE "equipped" -> 'bag' IS NULL;


-- ============================================================
-- Seed: characters carried over from the local-only build
-- ============================================================

INSERT INTO players (id, email, nick, password_hash) VALUES
  ('7133e2c9-f10e-407b-bc15-886c1a08ac9a', 'arek09082001@gmail.com', 'arek', 'sha256$1f24d716f23e005f67392406a0175c9d$e00b71f57532f0aa0ee118b4a12fb0dd53b24faded9d3f45551cdc7a32746716')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, nick = EXCLUDED.nick;

INSERT INTO game_profiles (
  id, nick, level, exp, exp_max, gold, pa, pa_max, pa_regenerated_at,
  played_seconds, last_seen_at, vitality, strength, luck,
  vitality_points_assigned, strength_points_assigned, luck_points_assigned,
  attribute_points, hp, dmg_min, dmg_max, armor, crit_chance, crit_power,
  dodge, stun, monsters_killed, unique_items_found, heroic_items_found,
  legendary_items_found, current_map_id, rest_tasks, stage_progress,
  inventory, equipped, updated_at
) VALUES (
  '7133e2c9-f10e-407b-bc15-886c1a08ac9a', 'arek', 34, 893, 17345, 2385, 200, 200, '2026-07-29T10:42:33.249Z'::timestamptz,
  3759, '2026-07-29T10:42:33.249Z'::timestamptz, 25, 35, 19,
  20, 30, 14,
  2, 620, 107, 175, 78, 29, 230,
  11, 4, 838, 123, 37,
  11, 3, '{}'::jsonb, '{"1_ithan-hunters-cave":6,"1_ithan-yss":6,"2_torneg-mountain-cave":6,"2_torneg-spider-nest":6,"3_karka-virgin-forest":6,"3_karka-zulu-settlement":6}'::jsonb,
  '[{"id":"drop_c1fd26ee0c5ef1a7","name":"Medal","icon":"items/medal.gif","image":"items/medal.gif","imageUrl":"/game-assets/items/medal.gif","type":"talisman","itemType":"talisman","itemTypeName":"Talizman","rarity":"common","rarityName":"Zwykły","rarityColor":"#ffffff","rarityCss":"","level":30,"stats":{"stun":4},"bonusStats":{"stun":{"value":4,"name":"Ogłuszenie","suffix":"%"}},"effect":null,"effectValue":null,"effectData":null,"power":12,"price":12,"quantity":1,"stun":4},{"id":"drop_adf819c5435c176c","name":"Butelka PA","icon":"items/pa.gif","image":"items/pa.gif","imageUrl":"/game-assets/items/pa.gif","type":"potion","itemType":"potion","itemTypeName":"Mikstura","rarity":"common","rarityName":"Zwykły","rarityColor":"#ffffff","rarityCss":"","level":30,"stats":{},"bonusStats":{},"effect":"pa","effectValue":5,"effectData":{"type":"pa","value":5},"power":10,"price":10,"quantity":1},{"id":"drop_d2245218c93036e5","name":"Mocny Zbroja płytowa","icon":"items/plate.gif","image":"items/plate.gif","imageUrl":"/game-assets/items/plate.gif","type":"armor","itemType":"armor","itemTypeName":"Zbroja","rarity":"unique","rarityName":"Unikalny","rarityColor":"#66cc66","rarityCss":"unique","level":30,"stats":{"armor":59,"hp":83},"bonusStats":{"hp":{"value":83,"name":"Punkty życia","suffix":""}},"effect":null,"effectValue":null,"effectData":null,"power":613,"price":1532,"quantity":1,"armor":59,"hp":83},{"id":"drop_25d8866b45e51725","name":"Zaklęty Młot","icon":"items/hammer.gif","image":"items/hammer.gif","imageUrl":"/game-assets/items/hammer.gif","type":"weapon","itemType":"weapon","itemTypeName":"Broń","rarity":"unique","rarityName":"Unikalny","rarityColor":"#66cc66","rarityCss":"unique","level":30,"stats":{"dmgMin":28,"dmgMax":57,"critChance":20},"bonusStats":{"critChance":{"value":20,"name":"Szansa krytyka","suffix":"%"}},"effect":null,"effectValue":null,"effectData":null,"power":552,"price":1380,"quantity":1,"dmgMin":28,"dmgMax":57,"critChance":20},{"id":"drop_3cea684beb0ea60c","name":"Butelka PA","icon":"items/pa.gif","image":"items/pa.gif","imageUrl":"/game-assets/items/pa.gif","type":"potion","itemType":"potion","itemTypeName":"Mikstura","rarity":"common","rarityName":"Zwykły","rarityColor":"#ffffff","rarityCss":"","level":30,"stats":{},"bonusStats":{},"effect":"pa","effectValue":5,"effectData":{"type":"pa","value":5},"power":10,"price":10,"quantity":1},{"id":"drop_16045411999fcc76","name":"Boski Butelka PA","icon":"items/pa.gif","image":"items/pa.gif","imageUrl":"/game-assets/items/pa.gif","type":"potion","itemType":"potion","itemTypeName":"Mikstura","rarity":"legendary","rarityName":"Legendarny","rarityColor":"#fa9a20","rarityCss":"legendary","level":30,"stats":{},"bonusStats":{},"effect":"pa","effectValue":25,"effectData":{"type":"pa","value":25},"power":50,"price":500,"quantity":1},null,null,null,null,null,null,null,null,null]'::jsonb, '{"weapon":{"id":"701_417aecf76940","shopItemId":"701","name":"Kosa Zapomnianego Króla","icon":"items/spear.gif","image":"items/spear.gif","imageUrl":"/game-assets/items/spear.gif","type":"weapon","itemType":"weapon","itemTypeName":"Broń","rarity":"legendary","rarityName":"Legendarny","rarityColor":"#fa9a20","rarityCss":"legendary","level":30,"stats":{"dmgMin":90,"dmgMax":140,"critChance":10,"critPower":50,"doubleDamage":10},"bonusStats":{"dmgMin":90,"dmgMax":140,"critChance":10,"critPower":50,"doubleDamage":10},"effect":null,"effectValue":null,"effectData":null,"power":300,"price":55000,"quantity":1,"dmgMin":90,"dmgMax":140,"critChance":10,"critPower":50,"doubleDamage":10},"armor":{"id":"415_92fa81db589a","shopItemId":"415","name":"Zbroja Górskiego Klanu","icon":"items/chainmail.gif","image":"items/chainmail.gif","imageUrl":"/game-assets/items/chainmail.gif","type":"armor","itemType":"armor","itemTypeName":"Zbroja","rarity":"heroic","rarityName":"Heroiczny","rarityColor":"#2090fe","rarityCss":"heroic","level":25,"stats":{"armor":78,"hp":85,"dodge":6},"bonusStats":{"armor":78,"hp":85,"dodge":6},"effect":null,"effectValue":null,"effectData":null,"power":169,"price":13000,"quantity":1,"armor":78,"hp":85,"dodge":6},"accessory":{"id":"425_ec005dcec7e4","shopItemId":"425","name":"Amulet Zaćmienia","icon":"items/amulet.gif","image":"items/amulet.gif","imageUrl":"/game-assets/items/amulet.gif","type":"talisman","itemType":"talisman","itemTypeName":"Talizman","rarity":"legendary","rarityName":"Legendarny","rarityColor":"#fa9a20","rarityCss":"legendary","level":25,"stats":{"hp":120,"critChance":8,"critPower":30,"stun":4},"bonusStats":{"hp":120,"critChance":8,"critPower":30,"stun":4},"effect":null,"effectValue":null,"effectData":null,"power":162,"price":20000,"quantity":1,"hp":120,"critChance":8,"critPower":30,"stun":4},"bag":null}'::jsonb, now()
)
ON CONFLICT (id) DO UPDATE SET
  nick = EXCLUDED.nick, level = EXCLUDED.level, exp = EXCLUDED.exp, exp_max = EXCLUDED.exp_max,
  gold = EXCLUDED.gold, pa = EXCLUDED.pa, pa_max = EXCLUDED.pa_max,
  inventory = EXCLUDED.inventory, equipped = EXCLUDED.equipped,
  stage_progress = EXCLUDED.stage_progress, updated_at = now();
