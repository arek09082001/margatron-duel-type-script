/**
 * Port of `app/Game/Services/GameProfileService.php`.
 *
 * Every function here mutates a profile *draft* (a structuredClone made by the
 * store) rather than returning a new object — this keeps the control flow
 * identical to the Eloquent version and keeps multi-step actions like
 * "battle → apply victory → level up → recalculate" readable.
 */

import { inventorySize } from './bags';
import {
    ACTION_POINTS_PER_LEVEL,
    INVENTORY_SIZE,
    PLAY_SESSION_GRACE_SECONDS,
    actionPointRegenerationLimit,
    actionPointRegenerationSeconds,
} from './config';
import { itemStat as stat } from './equipment';
import { GameError } from './errors';
import type {
    ActionPointState,
    GameProfile,
    LevelUpResult,
    PlayerAttributeKey,
    PlayerView,
} from './types';

export function expForNextLevel(level: number): number {
    return Math.floor(5 + level * level * 15);
}

export function createProfile(id: string, nick: string, now: number = Date.now()): GameProfile {
    const limit = actionPointRegenerationLimit();

    return {
        id,
        nick,
        level: 1,
        exp: 0,
        expMax: expForNextLevel(1),
        gold: 100,
        pa: limit,
        paMax: limit,
        paRegeneratedAt: now,
        playedSeconds: 0,
        lastSeenAt: now,
        vitality: 5,
        strength: 5,
        luck: 5,
        vitalityPointsAssigned: 0,
        strengthPointsAssigned: 0,
        luckPointsAssigned: 0,
        attributePoints: 0,
        hp: 50,
        dmgMin: 1,
        dmgMax: 2,
        armor: 0,
        critChance: 5,
        critPower: 150,
        dodge: 3,
        stun: 0,
        monstersKilled: 0,
        uniqueItemsFound: 0,
        heroicItemsFound: 0,
        legendaryItemsFound: 0,
        restTasks: {},
        currentMapId: 1,
        stageProgress: {},
        inventory: Array.from({ length: INVENTORY_SIZE }, () => null),
        equipped: { weapon: null, armor: null, accessory: null, bag: null },
    };
}

/** Recomputes every derived combat stat from attributes + equipment. */
export function recalculate(profile: GameProfile): GameProfile {
    const { weapon, armor, accessory } = profile.equipped;

    const baseDmgMin = stat(weapon, 'dmgMin') || 1;
    const baseDmgMax = stat(weapon, 'dmgMax') || 2;
    const baseArmor = stat(armor, 'armor') || 0;
    const hpBonus = stat(weapon, 'hp') + stat(armor, 'hp') + stat(accessory, 'hp');
    const critChanceBonus = stat(weapon, 'critChance') + stat(accessory, 'critChance');
    const critPowerBonus = stat(weapon, 'critPower') + stat(accessory, 'critPower');
    const dodgeBonus = stat(armor, 'dodge') + stat(accessory, 'dodge');
    const stunBonus = stat(weapon, 'stun') + stat(accessory, 'stun');

    const hp = 50 + (profile.vitality - 5) * 10 + (profile.level - 1) * 5 + hpBonus;
    const critChance = 5 + critChanceBonus + Math.floor(profile.luck / 3);
    const dodgeChance = 2 + dodgeBonus + Math.floor(profile.luck / 5);

    profile.hp = Math.max(1, hp);
    profile.dmgMin = baseDmgMin + Math.floor(profile.strength / 2);
    profile.dmgMax = baseDmgMax + profile.strength;
    profile.armor = baseArmor;
    profile.critChance = Math.min(50, critChance);
    profile.critPower = 150 + critPowerBonus;
    profile.dodge = Math.min(40, dodgeChance);
    profile.stun = Math.min(40, stunBonus);

    return profile;
}

/**
 * Accrues play time for the "5 hours played" achievement. Gaps longer than the
 * grace window are treated as the player being away, not playing.
 */
export function recordActivity(profile: GameProfile, now: number = Date.now()): boolean {
    const elapsedSeconds = Math.max(0, Math.floor((now - profile.lastSeenAt) / 1000));
    const secondsToAdd = Math.min(PLAY_SESSION_GRACE_SECONDS, elapsedSeconds);

    if (secondsToAdd <= 0 && now <= profile.lastSeenAt) {
        return false;
    }

    profile.playedSeconds = Math.max(0, profile.playedSeconds) + secondsToAdd;
    profile.lastSeenAt = now;

    return secondsToAdd > 0;
}

/**
 * Lazy action-point regeneration.
 *
 * The Laravel build ticked this with queued jobs + websocket broadcasts. With
 * no backend we derive the same result from elapsed wall-clock time, so the
 * player regenerates while the tab is closed exactly as before.
 */
export function regenerateActionPoints(profile: GameProfile, now: number = Date.now()): boolean {
    const interval = actionPointRegenerationSeconds() * 1000;
    const limit = actionPointRegenerationLimit();
    const currentPa = Math.max(0, profile.pa);

    if (currentPa >= limit) {
        profile.pa = currentPa;
        profile.paRegeneratedAt = now;

        return false;
    }

    const elapsed = Math.max(0, now - profile.paRegeneratedAt);
    const pointsToRestore = Math.floor(elapsed / interval);

    if (pointsToRestore <= 0) {
        return false;
    }

    const newPa = Math.min(limit, currentPa + pointsToRestore);
    const restoredPoints = newPa - currentPa;

    profile.pa = newPa;
    profile.paRegeneratedAt =
        newPa >= limit ? now : profile.paRegeneratedAt + restoredPoints * interval;

    return restoredPoints > 0;
}

export function actionPointState(profile: GameProfile): ActionPointState {
    const limit = actionPointRegenerationLimit();
    const regenerationSeconds = actionPointRegenerationSeconds();

    return {
        pa: profile.pa,
        paMax: profile.paMax,
        paLimit: limit,
        paRegenerationLimit: limit,
        paRegenerationSeconds: regenerationSeconds,
        paRegeneratesAt:
            profile.pa < limit ? profile.paRegeneratedAt + regenerationSeconds * 1000 : null,
    };
}

export function addExperience(profile: GameProfile, amount: number, now: number = Date.now()): LevelUpResult {
    const startLevel = profile.level;
    let currentExp = profile.exp + Math.max(0, amount);
    let levelsGained = 0;

    while (currentExp >= profile.expMax) {
        currentExp -= profile.expMax;
        profile.level++;
        levelsGained++;
        profile.expMax = expForNextLevel(profile.level);
        profile.attributePoints += 2;
        profile.pa += ACTION_POINTS_PER_LEVEL;
    }

    profile.exp = currentExp;

    if (levelsGained > 0) {
        profile.paRegeneratedAt = now;
    }

    recalculate(profile);

    return {
        leveledUp: levelsGained > 0,
        levelsGained,
        oldLevel: startLevel,
        newLevel: profile.level,
        newPaMax: profile.paMax,
    };
}

const ASSIGNED_COLUMN: Record<PlayerAttributeKey, keyof GameProfile> = {
    vitality: 'vitalityPointsAssigned',
    strength: 'strengthPointsAssigned',
    luck: 'luckPointsAssigned',
};

export function addAttribute(profile: GameProfile, attribute: PlayerAttributeKey): void {
    if (profile.attributePoints <= 0) {
        return;
    }

    const assignedColumn = ASSIGNED_COLUMN[attribute];

    profile.attributePoints--;
    profile[attribute]++;
    (profile[assignedColumn] as number) = (profile[assignedColumn] as number) + 1;

    recalculate(profile);
}

export function toPlayerView(profile: GameProfile): PlayerView {
    return {
        id: profile.id,
        nick: profile.nick,
        level: profile.level,
        exp: profile.exp,
        expMax: profile.expMax,
        gold: profile.gold,
        ...actionPointState(profile),
        vitality: profile.vitality,
        strength: profile.strength,
        luck: profile.luck,
        attributePoints: profile.attributePoints,
        hp: profile.hp,
        dmgMin: profile.dmgMin,
        dmgMax: profile.dmgMax,
        armor: profile.armor,
        critChance: profile.critChance,
        critPower: profile.critPower,
        dodge: profile.dodge,
        stun: profile.stun,
        currentMapId: profile.currentMapId,
        inventory: profile.inventory,
        inventorySize: inventorySize(profile.equipped),
        equipped: profile.equipped,
    };
}

export function spendPa(profile: GameProfile, amount: number, now: number = Date.now()): void {
    if (profile.pa < amount) {
        throw new GameError('Masz za mało PA.');
    }

    profile.pa -= amount;
    profile.paRegeneratedAt = now;
}
