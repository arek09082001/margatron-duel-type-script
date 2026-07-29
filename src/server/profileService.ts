/**
 * Server-side game session: load the profile, run one player action against
 * the pure domain layer, persist the result.
 *
 * This is where the Laravel controllers' job landed. Because `src/game/**` is
 * framework-agnostic, the exact same functions the browser used to call now
 * run here — which also makes the game authoritative rather than trusting
 * whatever the client sends.
 */

import { fightArena, fightStage, fightToughEnemy } from '@/game/battle';
import { GameError } from '@/game/errors';
import { buyItem, consumeItem, equip, sell, sellAll, unequip } from '@/game/inventory';
import { addAttribute, createProfile, recalculate } from '@/game/profile';
import { instantRest, startRest } from '@/game/rest';
import { buyPa, selectMap, settleProfile } from '@/game/state';
import { levelRanking } from '@/game/ranking';
import type {
    ArenaDifficultyValue,
    BattleResult,
    EquipmentSlot,
    GameProfile,
    PlayerAttributeKey,
    PlayerRanking,
    ToughEnemyKind,
} from '@/game/types';
import { prisma } from './prisma';
import { profileToRow, rowToProfile } from './profileMapper';

export type GameAction =
    | { type: 'addAttribute'; attribute: PlayerAttributeKey }
    | { type: 'selectMap'; mapId: number }
    | { type: 'rest'; minutes: number }
    | { type: 'instantRest' }
    | { type: 'buyPa'; amount: number }
    | { type: 'buyItem'; shopId: string; itemId: string | number }
    | { type: 'equipItem'; index: number }
    | { type: 'unequipItem'; slot: EquipmentSlot }
    | { type: 'sellItem'; index: number }
    | { type: 'sellAllItems' }
    | { type: 'usePotion'; index: number }
    | { type: 'fightStage'; locationId: string; stage: number }
    | { type: 'fightArena'; difficulty: ArenaDifficultyValue }
    | { type: 'fightTough'; locationId: string; enemyType: ToughEnemyKind };

/**
 * The client gets the profile, not a snapshot: it derives the snapshot with
 * the same pure `buildSnapshot`, which keeps the payload small and lets it
 * tick action-point regeneration locally between actions.
 */
export type ActionResult = {
    profile: GameProfile;
    battle?: BattleResult;
};

import type { SessionPlayer } from './session';

export async function loadProfile(userId: string): Promise<GameProfile | null> {
    const row = await prisma.gameProfile.findUnique({ where: { id: userId } });

    return row ? rowToProfile(row) : null;
}

export async function saveProfile(profile: GameProfile): Promise<void> {
    const data = profileToRow(profile);

    await prisma.gameProfile.upsert({
        where: { id: profile.id },
        create: { id: profile.id, ...data },
        update: data,
    });
}

/**
 * Returns the caller's profile, creating one on first login.
 *
 * `seed` lets a brand-new account adopt a character that was played locally
 * before Supabase existed — see the import route.
 */
export async function getOrCreateProfile(
    player: SessionPlayer,
    seed?: GameProfile,
): Promise<GameProfile> {
    const existing = await loadProfile(player.id);

    if (existing) {
        return existing;
    }

    const nick = await uniqueNick(player.nick);
    const profile = seed
        ? { ...seed, id: player.id, nick }
        : createProfile(player.id, nick);

    recalculate(profile);
    await saveProfile(profile);

    return profile;
}

/** `nick` is unique; suffix on collision rather than failing the login. */
async function uniqueNick(preferred: string): Promise<string> {
    let candidate = preferred.slice(0, 20);

    for (let attempt = 0; attempt < 25; attempt++) {
        const taken = await prisma.gameProfile.findUnique({
            where: { nick: candidate },
            select: { id: true },
        });

        if (!taken) {
            return candidate;
        }

        candidate = `${preferred.slice(0, 16)}_${attempt + 2}`;
    }

    throw new GameError('Nie udało się nadać unikalnego nicku.');
}

function apply(profile: GameProfile, action: GameAction, now: number): BattleResult | undefined {
    switch (action.type) {
        case 'addAttribute':
            addAttribute(profile, action.attribute);
            return;
        case 'selectMap':
            selectMap(profile, action.mapId);
            return;
        case 'rest':
            startRest(profile, action.minutes, now);
            return;
        case 'instantRest':
            instantRest(profile, now);
            return;
        case 'buyPa':
            buyPa(profile, action.amount, now);
            return;
        case 'buyItem':
            buyItem(profile, action.shopId, action.itemId);
            return;
        case 'equipItem':
            equip(profile, action.index);
            return;
        case 'unequipItem':
            unequip(profile, action.slot);
            return;
        case 'sellItem':
            sell(profile, action.index);
            return;
        case 'sellAllItems':
            sellAll(profile);
            return;
        case 'usePotion':
            consumeItem(profile, action.index, now);
            return;
        case 'fightStage':
            return fightStage(profile, action.locationId, action.stage, now);
        case 'fightArena':
            return fightArena(profile, action.difficulty, now);
        case 'fightTough':
            return fightToughEnemy(profile, action.locationId, action.enemyType, now);
    }
}

/**
 * Runs one action. The profile is settled against the wall clock first, so
 * regenerated action points and finished rests are accounted for exactly as
 * the queue workers used to do.
 */
export async function runAction(player: SessionPlayer, action: GameAction): Promise<ActionResult> {
    const profile = await getOrCreateProfile(player);
    const now = Date.now();

    settleProfile(profile, now);
    const battle = apply(profile, action, now);
    recalculate(profile);

    await saveProfile(profile);

    return { profile, battle };
}

/** Settles and persists without applying an action — used by the initial load. */
export async function currentProfile(player: SessionPlayer): Promise<GameProfile> {
    const profile = await getOrCreateProfile(player);
    const now = Date.now();

    if (settleProfile(profile, now)) {
        await saveProfile(profile);
    }

    return profile;
}

export async function globalRanking(userId: string, limit = 20): Promise<PlayerRanking> {
    const rows = await prisma.gameProfile.findMany({
        orderBy: [{ level: 'desc' }, { exp: 'desc' }, { id: 'asc' }],
        select: { id: true, nick: true, level: true, exp: true },
    });

    // levelRanking already implements the ordering and "my position" logic; feed
    // it the minimal shape it reads.
    return levelRanking(rows as unknown as GameProfile[], userId, limit);
}
