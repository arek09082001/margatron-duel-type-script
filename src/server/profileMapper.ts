/**
 * Translates between the database row (snake_case columns, `timestamptz`) and
 * the in-game `GameProfile` (camelCase, epoch milliseconds).
 *
 * Timestamps are the only real impedance mismatch: the game does all of its
 * time arithmetic in epoch milliseconds, Postgres stores instants.
 */

import type { GameProfile } from '@/game/types';
import type { Equipped, Item, RestTask } from '@/game/types';
import { inventorySize } from '@/game/bags';

/** The subset of the Prisma row we read. Declared structurally to avoid a hard
 *  dependency on the generated client in shared code paths. */
export type ProfileRow = {
    id: string;
    nick: string;
    level: number;
    exp: number;
    expMax: number;
    gold: number;
    pa: number;
    paMax: number;
    paRegeneratedAt: Date;
    playedSeconds: number;
    lastSeenAt: Date;
    vitality: number;
    strength: number;
    luck: number;
    vitalityPointsAssigned: number;
    strengthPointsAssigned: number;
    luckPointsAssigned: number;
    attributePoints: number;
    hp: number;
    dmgMin: number;
    dmgMax: number;
    armor: number;
    critChance: number;
    critPower: number;
    dodge: number;
    stun: number;
    monstersKilled: number;
    uniqueItemsFound: number;
    heroicItemsFound: number;
    legendaryItemsFound: number;
    currentMapId: number;
    restTasks: unknown;
    stageProgress: unknown;
    inventory: unknown;
    equipped: unknown;
};

/**
 * Pads/truncates to the slot count the equipped bag allows, so a malformed row
 * cannot break the grid.
 *
 * Occupied slots past that count survive: a row written before the bag was
 * taken off would otherwise lose items on the next read. `normalizedInventory`
 * makes the same promise in the game layer.
 */
function normalizeInventory(value: unknown, equipped: Equipped): Array<Item | null> {
    const raw = Array.isArray(value) ? value : [];
    const size = inventorySize(equipped);
    const lastUsed = raw.reduce((last, item, index) => (item ? index : last), -1);
    const length = Math.max(size, lastUsed + 1);
    const slots = raw.slice(0, length).map((item) => (item ?? null) as Item | null);

    while (slots.length < length) {
        slots.push(null);
    }

    return slots;
}

function normalizeEquipped(value: unknown): Equipped {
    const raw = (value ?? {}) as Partial<Equipped>;

    return {
        weapon: raw.weapon ?? null,
        armor: raw.armor ?? null,
        accessory: raw.accessory ?? null,
        // Absent on every profile saved before bags existed.
        bag: raw.bag ?? null,
    };
}

function normalizeRecord<T>(value: unknown): Record<string, T> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, T>)
        : {};
}

export function rowToProfile(row: ProfileRow): GameProfile {
    const equipped = normalizeEquipped(row.equipped);

    return {
        id: row.id,
        nick: row.nick,
        level: row.level,
        exp: row.exp,
        expMax: row.expMax,
        gold: row.gold,
        pa: row.pa,
        paMax: row.paMax,
        paRegeneratedAt: row.paRegeneratedAt.getTime(),
        playedSeconds: row.playedSeconds,
        lastSeenAt: row.lastSeenAt.getTime(),
        vitality: row.vitality,
        strength: row.strength,
        luck: row.luck,
        vitalityPointsAssigned: row.vitalityPointsAssigned,
        strengthPointsAssigned: row.strengthPointsAssigned,
        luckPointsAssigned: row.luckPointsAssigned,
        attributePoints: row.attributePoints,
        hp: row.hp,
        dmgMin: row.dmgMin,
        dmgMax: row.dmgMax,
        armor: row.armor,
        critChance: row.critChance,
        critPower: row.critPower,
        dodge: row.dodge,
        stun: row.stun,
        monstersKilled: row.monstersKilled,
        uniqueItemsFound: row.uniqueItemsFound,
        heroicItemsFound: row.heroicItemsFound,
        legendaryItemsFound: row.legendaryItemsFound,
        restTasks: normalizeRecord<RestTask>(row.restTasks),
        currentMapId: row.currentMapId,
        stageProgress: normalizeRecord<number>(row.stageProgress),
        inventory: normalizeInventory(row.inventory, equipped),
        equipped,
    };
}

/** Column values for a create/update. `id` is set by the caller from the session. */
export function profileToRow(profile: GameProfile) {
    return {
        nick: profile.nick,
        level: profile.level,
        exp: profile.exp,
        expMax: profile.expMax,
        gold: profile.gold,
        pa: profile.pa,
        paMax: profile.paMax,
        paRegeneratedAt: new Date(profile.paRegeneratedAt),
        playedSeconds: profile.playedSeconds,
        lastSeenAt: new Date(profile.lastSeenAt),
        vitality: profile.vitality,
        strength: profile.strength,
        luck: profile.luck,
        vitalityPointsAssigned: profile.vitalityPointsAssigned,
        strengthPointsAssigned: profile.strengthPointsAssigned,
        luckPointsAssigned: profile.luckPointsAssigned,
        attributePoints: profile.attributePoints,
        hp: profile.hp,
        dmgMin: profile.dmgMin,
        dmgMax: profile.dmgMax,
        armor: profile.armor,
        critChance: Math.round(profile.critChance),
        critPower: Math.round(profile.critPower),
        dodge: Math.round(profile.dodge),
        stun: Math.round(profile.stun),
        monstersKilled: profile.monstersKilled,
        uniqueItemsFound: profile.uniqueItemsFound,
        heroicItemsFound: profile.heroicItemsFound,
        legendaryItemsFound: profile.legendaryItemsFound,
        currentMapId: profile.currentMapId,
        restTasks: profile.restTasks as object,
        stageProgress: profile.stageProgress as object,
        inventory: profile.inventory as unknown as object,
        equipped: profile.equipped as unknown as object,
    };
}
