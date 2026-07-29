-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "nick" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_profiles" (
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
    "equipped" JSONB NOT NULL DEFAULT '{"weapon":null,"armor":null,"accessory":null}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "game_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_email_key" ON "players"("email");

-- CreateIndex
CREATE UNIQUE INDEX "players_nick_key" ON "players"("nick");

-- CreateIndex
CREATE UNIQUE INDEX "game_profiles_nick_key" ON "game_profiles"("nick");

-- CreateIndex
CREATE INDEX "game_profiles_ranking_idx" ON "game_profiles"("level" DESC, "exp" DESC);

-- AddForeignKey
ALTER TABLE "game_profiles" ADD CONSTRAINT "game_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
