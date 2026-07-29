/**
 * Server-side game session: load the profile, run one player action against
 * the pure domain layer, persist the result.
 *
 * This is where the Laravel controllers' job landed. Because `src/game/**` is
 * framework-agnostic, the exact same functions the browser used to call now
 * run here — which also makes the game authoritative rather than trusting
 * whatever the client sends.
 */

import { GameError } from '@/game/errors';
import { createProfile, recalculate } from '@/game/profile';
import { settleProfile } from '@/game/state';
import { levelRanking } from '@/game/ranking';
import type { GameProfile, PlayerRanking } from '@/game/types';
import { prisma } from './prisma';
import { profileToRow, rowToProfile } from './profileMapper';
import type { SessionPlayer } from './session';

/**
 * Identifies which version of a row a client based its changes on.
 *
 * Gameplay is client-authoritative, so a sync overwrites the stored profile
 * wholesale. Without this, a tab left open on another device would flush its
 * stale copy and silently wipe out newer progress — a far worse failure than
 * the cheating we are already accepting.
 */
export type ProfileRevision = string;

export type LoadedProfile = {
    profile: GameProfile;
    revision: ProfileRevision;
};

export class RevisionConflictError extends Error {
    constructor(readonly current: LoadedProfile) {
        super('Profil został zmieniony na innym urządzeniu.');
        this.name = 'RevisionConflictError';
    }
}

export async function loadProfile(userId: string): Promise<GameProfile | null> {
    const row = await prisma.gameProfile.findUnique({ where: { id: userId } });

    return row ? rowToProfile(row) : null;
}

/** `updatedAt` doubles as the revision — no extra column, no extra migration. */
function revisionOf(updatedAt: Date): ProfileRevision {
    return updatedAt.toISOString();
}

export async function loadProfileWithRevision(userId: string): Promise<LoadedProfile | null> {
    const row = await prisma.gameProfile.findUnique({ where: { id: userId } });

    return row ? { profile: rowToProfile(row), revision: revisionOf(row.updatedAt) } : null;
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
 * The caller's profile, brought up to date with the wall clock.
 *
 * Deliberately does **not** write. Settling is derived purely from stored
 * timestamps, so recomputing it on the next read gives the same answer — and
 * persisting it here would bump `updated_at`, invalidating the revision every
 * other open client is holding. A read must never invalidate a writer.
 */
export async function currentProfile(player: SessionPlayer): Promise<LoadedProfile> {
    await getOrCreateProfile(player);

    const loaded = (await loadProfileWithRevision(player.id))!;

    settleProfile(loaded.profile, Date.now());

    return loaded;
}

/**
 * Persists the profile the client computed.
 *
 * Gameplay runs in the browser so battles resolve instantly, which means this
 * trusts the payload. `baseRevision` is the guard that matters: it must match
 * the row the client last read, otherwise another device has written since and
 * overwriting would destroy that progress.
 */
export async function syncProfile(
    player: SessionPlayer,
    incoming: GameProfile,
    baseRevision: ProfileRevision,
): Promise<LoadedProfile> {
    const stored = await loadProfileWithRevision(player.id);

    if (!stored) {
        throw new GameError('Brak postaci do zapisania.');
    }

    if (stored.revision !== baseRevision) {
        throw new RevisionConflictError(stored);
    }

    // id and nick come from the session, never from the payload.
    const profile: GameProfile = { ...incoming, id: player.id, nick: stored.profile.nick };

    recalculate(profile);
    await saveProfile(profile);

    return (await loadProfileWithRevision(player.id))!;
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
