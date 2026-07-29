/**
 * Port of `app/Game/Services/GameStateService.php` — map/stage progression,
 * the PA shop, and the snapshot the UI renders from.
 */

import { MAPS, WORLD_MAP_POSITIONS, getMap, shopsFor, stagesForLocation } from './catalog';
import { STAGES_PER_LOCATION } from './config';
import { GameError } from './errors';
import { recalculate, recordActivity, regenerateActionPoints, toPlayerView } from './profile';
import { completeExpiredRests, restStateFor } from './rest';
import type { GameLocation, GameMapData, GameProfile, GameSnapshot, PaOffer, WorldMapPin } from './types';

/** PA shop prices before the level multiplier is applied. */
const PA_BASE_PRICES: Record<number, number> = {
    5: 100,
    10: 180,
    15: 250,
};

const PA_LEVEL_PRICE_FACTOR = 0.1111;

export function stageProgressKey(mapId: number, locationId: string): string {
    return `${mapId}_${locationId}`;
}

export function unlockedStage(profile: GameProfile, mapId: number, locationId: string): number {
    return profile.stageProgress[stageProgressKey(mapId, locationId)] ?? 1;
}

export function unlockNextStage(
    profile: GameProfile,
    mapId: number,
    locationId: string,
    stage: number,
): void {
    const key = stageProgressKey(mapId, locationId);

    profile.stageProgress = {
        ...profile.stageProgress,
        [key]: Math.max(profile.stageProgress[key] ?? 1, Math.min(STAGES_PER_LOCATION + 1, stage + 1)),
    };
}

export function selectMap(profile: GameProfile, mapId: number): void {
    const map = getMap(mapId);

    if (profile.level < map.requiredLevel) {
        throw new GameError('Masz za niski poziom na tę mapę.');
    }

    profile.currentMapId = mapId;
}

function calculatePaPrice(profile: GameProfile, amount: number): number {
    const basePrice = PA_BASE_PRICES[amount];

    if (basePrice === undefined) {
        throw new GameError('Nieprawidłowa ilość PA.');
    }

    return Math.round(basePrice * Math.max(1, profile.level) * PA_LEVEL_PRICE_FACTOR);
}

export function paOffers(profile: GameProfile): PaOffer[] {
    return Object.keys(PA_BASE_PRICES)
        .map((amount) => Number.parseInt(amount, 10))
        .map((amount) => ({ amount, price: calculatePaPrice(profile, amount) }));
}

export function buyPa(profile: GameProfile, amount: number, now: number = Date.now()): void {
    const price = calculatePaPrice(profile, amount);

    if (profile.gold < price) {
        throw new GameError('Masz za mało złota.');
    }

    profile.gold -= price;
    profile.pa += amount;
    profile.paRegeneratedAt = now;
}

/** Attaches per-player stage unlock state to the battle locations. */
function withRuntimeMapData(profile: GameProfile, map: GameMapData): GameMapData {
    const locations: GameLocation[] = map.locations.map((location) => {
        if (location.type !== 'battle') {
            return location;
        }

        const unlocked = unlockedStage(profile, map.id, location.id);

        return {
            ...location,
            unlockedStage: unlocked,
            stages: stagesForLocation(location, unlocked),
        };
    });

    return { ...map, locations };
}

function worldMaps(profile: GameProfile): WorldMapPin[] {
    return WORLD_MAP_POSITIONS.map((position): WorldMapPin => {
        const map = MAPS[position.id] ?? null;

        return {
            ...position,
            name: map?.name ?? 'Nieodkryta kraina',
            requiredLevel: map?.requiredLevel ?? 999,
            locked: map === null || profile.level < map.requiredLevel,
            current: map !== null && profile.currentMapId === map.id,
        };
    });
}

/**
 * Brings a profile up to date with the wall clock: collects finished rests,
 * accrues regenerated action points, and books play time.
 *
 * This replaces the Laravel queue workers (`RegenerateActionPoints`,
 * `CompleteRest`). It is idempotent, so it can safely run on every load, every
 * player action and on the UI's one-second tick.
 *
 * Returns true when anything actually changed, so callers can skip writes.
 */
export function settleProfile(profile: GameProfile, now: number = Date.now()): boolean {
    const restsCompleted = completeExpiredRests(profile, now);
    const actionPointsRegenerated = regenerateActionPoints(profile, now);
    const activityRecorded = recordActivity(profile, now);

    recalculate(profile);

    return restsCompleted || actionPointsRegenerated || activityRecorded;
}

/**
 * Builds the read model.
 *
 * Pure — call `settleProfile` first if the profile may be stale. Keeping this
 * side-effect free lets components memoise it directly off profile identity.
 */
export function buildSnapshot(profile: GameProfile, now: number = Date.now()): GameSnapshot {
    return {
        user: toPlayerView(profile),
        currentMap: withRuntimeMapData(profile, getMap(profile.currentMapId)),
        worldMaps: worldMaps(profile),
        shops: shopsFor(profile.level),
        paOffers: paOffers(profile),
        rest: restStateFor(profile, now),
    };
}
