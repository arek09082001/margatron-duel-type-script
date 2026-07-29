/**
 * Server-side game session: load the profile, run one player action against
 * the pure domain layer, persist the result.
 *
 * This is where the Laravel controllers' job landed. Because `src/game/**` is
 * framework-agnostic, the exact same functions the browser used to call now
 * run here — which also makes the game authoritative rather than trusting
 * whatever the client sends.
 */

import { applyGameAction, type GameAction } from '@/game/actions';
import { GameError } from '@/game/errors';
import { createProfile, recalculate } from '@/game/profile';
import { settleProfile } from '@/game/state';
import { levelRanking } from '@/game/ranking';
import type { BattleResult, GameProfile, PlayerRanking } from '@/game/types';
import { prisma } from './prisma';
import { profileToRow, rowToProfile } from './profileMapper';
import type { SessionPlayer } from './session';

/**
 * The client gets the profile, not a snapshot: it derives the snapshot with
 * the same pure `buildSnapshot`, which keeps the payload small and lets it
 * tick action-point regeneration locally between actions.
 */
export type ActionResult = {
    profile: GameProfile;
    /** One entry per submitted action; null for actions with no battle. */
    battles: Array<BattleResult | null>;
    /** Index of the first action that failed, if any. Earlier ones still applied. */
    failedIndex?: number;
    /** Why that action failed, for the alert modal. */
    message?: string;
};

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

/**
 * Runs a batch of actions in order.
 *
 * The client applies deterministic actions optimistically and flushes them
 * together — often alongside a battle — so a handful of clicks costs one
 * request instead of one each.
 *
 * A failing action stops the batch rather than aborting it: everything before
 * it was legal and the player already saw it applied. The returned profile is
 * the state after the last successful action, and `failedIndex` tells the
 * client how far to trust its optimistic copy.
 */
export async function runActions(
    player: SessionPlayer,
    actions: GameAction[],
): Promise<ActionResult> {
    const profile = await getOrCreateProfile(player);
    const now = Date.now();

    settleProfile(profile, now);

    const battles: Array<BattleResult | null> = [];
    let failedIndex: number | undefined;
    let message: string | undefined;

    for (const [index, action] of actions.entries()) {
        try {
            battles.push(applyGameAction(profile, action, now) ?? null);
        } catch (error) {
            if (!(error instanceof GameError)) {
                throw error;
            }

            failedIndex = index;
            message = error.message;
            break;
        }
    }

    recalculate(profile);
    await saveProfile(profile);

    return { profile, battles, failedIndex, message };
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
