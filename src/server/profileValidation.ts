import { MAX_INVENTORY_SIZE } from '@/game/config';
import type { GameProfile } from '@/game/types';

/**
 * Structural sanity check for a profile sent by the client.
 *
 * Gameplay is client-authoritative, so this deliberately does not police
 * *values* — the player can hand themselves gold, and that is the accepted
 * trade for instant battles. What it does prevent is a bug or a truncated
 * request writing a malformed row that the game could no longer load.
 */
export function isPlausibleProfile(value: unknown): value is GameProfile {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const profile = value as Partial<GameProfile>;

    const numbers: Array<number | undefined> = [
        profile.level,
        profile.exp,
        profile.expMax,
        profile.gold,
        profile.pa,
        profile.paMax,
        profile.paRegeneratedAt,
        profile.playedSeconds,
        profile.lastSeenAt,
        profile.vitality,
        profile.strength,
        profile.luck,
        profile.attributePoints,
        profile.hp,
        profile.currentMapId,
    ];

    if (numbers.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
        return false;
    }

    // The ceiling rather than the base size: a bag widens the backpack, and the
    // exact count is checked against the equipped bag in the game layer.
    if (!Array.isArray(profile.inventory) || profile.inventory.length > MAX_INVENTORY_SIZE) {
        return false;
    }

    if (!profile.equipped || typeof profile.equipped !== 'object') {
        return false;
    }

    return (
        typeof profile.restTasks === 'object' &&
        profile.restTasks !== null &&
        typeof profile.stageProgress === 'object' &&
        profile.stageProgress !== null
    );
}
