/**
 * "Moc przedmiotu": how much an item actually helps in a fight.
 *
 * The old figure was a fixed weighting — `damage × 6 + armour × 6 + hp × 0,6 +
 * (krytyk% + moc krytyka% + unik% + ogłuszenie%) × 20` — and it misled in every
 * direction that mattered:
 *
 * - **Moc krytyka counted the same as szansa krytyka.** Crit power only pays out
 *   on a crit, so at a realistic 10% crit chance one point of it is worth about
 *   a sixth of a point of crit chance. A level 10 talisman with `moc krytyka 28`
 *   scored 707 — above every chest piece of its level and just under the best
 *   weapon — while a strictly more useful talisman with six times the crit
 *   *chance* scored 262.
 * - **Armour and health were locked at 10:1 forever.** Armour is flat reduction,
 *   so its worth depends entirely on how big the incoming hit is: at level 10 one
 *   point eats 6% of a hit, at level 90 it eats 0,04%. One exchange rate cannot
 *   describe both.
 * - **Percentages were priced as if they scaled with level.** They do not — they
 *   grow only with tier and rarity — so the same 6% crit chance is worth a point
 *   or two of damage at level 10 and hundreds at level 90.
 *
 * What replaces it is the battle loop's own arithmetic. For the item's level we
 * take the character the curve describes (`WORN_GEAR_FACTOR` above the average
 * piece) and the enemy that character fights (`referenceEnemyHit`), and ask what
 * one more point of each stat is worth *there*:
 *
 *     obrażenia na turę   O = dmg × (1 + krytyk% / 100 × (moc krytyka% / 100 − 1))
 *     ciosy do przeżycia  T = hp / ((cios − pancerz) × (1 − unik%) × (1 − ogł.%))
 *
 * A fight is won by killing before dying, so what an item is worth is its effect
 * on `O × T`: doubling either is equally good. Every stat is therefore converted
 * into the damage-per-turn that would buy the same improvement, and the weights
 * fall out of the two formulas rather than being chosen:
 *
 * | Stat | Worth per point |
 * | --- | --- |
 * | obrażenia | the crit multiplier |
 * | szansa krytyka | `dmg × (moc krytyka − 100) / 10 000` |
 * | moc krytyka | `dmg × szansa krytyka / 10 000` |
 * | pancerz | `O / (cios − pancerz)` |
 * | punkty życia | `O / hp` |
 * | unik, ogłuszenie | `O / (100 − unik%)` |
 *
 * Because every weight is read at the item's own level, the number rises with
 * level (a level 90 piece cannot score like a level 10 one), percentages gain
 * value as levels climb, and armour loses it — all of which is what the battle
 * loop does.
 */

import { itemStat } from './equipment';
import {
    WORN_GEAR_FACTOR,
    armorBudget,
    healthBudget,
    referenceEnemyHit,
    weaponDamageBudget,
} from './gearCurve';
import { innateHealth } from './profile';
import type { Item, ItemStats, ItemTypeValue } from './types';

/**
 * The character every item is measured on.
 *
 * Crit chance and dodge are the base values `recalculate` hands out plus a
 * little from gear, and deliberately sit well under the 50% / 40% ceilings: an
 * item does not stop being the better item because its wearer is already capped,
 * so the yardstick keeps room above it.
 */
const REFERENCE_CRIT_CHANCE = 10;
const REFERENCE_CRIT_POWER = 165;
const REFERENCE_DODGE = 5;

/**
 * Points of power per point of expected damage per turn.
 *
 * Six, which is what the old formula charged for a point of weapon damage — so a
 * weapon lands in the range players are used to and only the mispriced stats
 * move.
 */
const POWER_PER_DAMAGE = 6;

/** Ordering figures for the two types with no combat value at all. */
const POWER_PER_BAG_SLOT = 120;

type Weights = {
    damage: number;
    critChance: number;
    critPower: number;
    armor: number;
    hp: number;
    /** Dodge and stun are the same trade: a turn the enemy does not get. */
    evasion: number;
};

/** What one point of each stat is worth at `level`, in damage per turn. */
export function powerWeights(level: number): Weights {
    const damage = weaponDamageBudget(level) * WORN_GEAR_FACTOR;
    const armor = armorBudget(level) * WORN_GEAR_FACTOR;
    // Gear health plus what the character has without any: at level 10 the two
    // are the same order of magnitude, and leaving the innate half out would
    // overprice a point of health against a point of armour by half again.
    const hp = healthBudget(level) * WORN_GEAR_FACTOR + innateHealth(level);
    const hit = referenceEnemyHit(level);

    const critMultiplier = 1 + (REFERENCE_CRIT_CHANCE / 100) * (REFERENCE_CRIT_POWER / 100 - 1);
    const offense = damage * critMultiplier;

    // `hit` is armour / 0,3 and worn armour is armour × 1,5, so the enemy always
    // lands for a little over half the hit — the subtraction cannot reach zero
    // and this stays finite at every level.
    const throughArmor = Math.max(1, hit - armor);

    return {
        damage: critMultiplier,
        critChance: (damage * (REFERENCE_CRIT_POWER - 100)) / 10_000,
        critPower: (damage * REFERENCE_CRIT_CHANCE) / 10_000,
        armor: offense / throughArmor,
        hp: offense / hp,
        evasion: offense / (100 - REFERENCE_DODGE),
    };
}

/** Expected damage per turn an item is worth to the character above. */
export function combatValue(level: number, stats: ItemStats): number {
    const weights = powerWeights(Math.max(1, level));
    const damage = ((stats.dmgMin ?? 0) + (stats.dmgMax ?? 0)) / 2;

    return (
        damage * weights.damage +
        (stats.critChance ?? 0) * weights.critChance +
        (stats.critPower ?? 0) * weights.critPower +
        (stats.armor ?? 0) * weights.armor +
        (stats.hp ?? 0) * weights.hp +
        ((stats.dodge ?? 0) + (stats.stun ?? 0)) * weights.evasion
    );
}

/**
 * The number the tooltip prints and the shop sorts by.
 *
 * Bags and potions get an ordering figure instead of a combat one — capacity and
 * action points do not fight — and the tooltip does not print theirs.
 */
export function powerOf(
    type: ItemTypeValue,
    level: number,
    stats: ItemStats,
    effect: { value: number } | null = null,
): number {
    if (type === 'bag') {
        return Math.max(0, Math.round((stats.bagSlots ?? 0) * POWER_PER_BAG_SLOT));
    }

    if (type === 'potion') {
        return Math.max(0, Math.round(effect?.value ?? 0));
    }

    return Math.max(1, Math.round(combatValue(level, stats) * POWER_PER_DAMAGE));
}

/** Whether "Moc przedmiotu" means anything for this type. */
export function hasCombatPower(item: Item): boolean {
    const type = item.type ?? item.itemType;

    return type !== 'bag' && type !== 'potion';
}

const READ_STATS = [
    'dmgMin',
    'dmgMax',
    'armor',
    'hp',
    'critChance',
    'critPower',
    'dodge',
    'stun',
    'bagSlots',
] as const;

/**
 * Power of an item as it stands today, rather than as it was when it dropped.
 *
 * Items are persisted whole, `power` included, so a character who has been
 * playing carries figures from whatever the formula was on the day each piece
 * dropped. Reading through this keeps the shop, the tooltip and the comparison
 * on one scale — the stored field is only ever a cache of it.
 */
export function itemPower(item: Item): number {
    const stats: ItemStats = {};

    for (const key of READ_STATS) {
        const value = itemStat(item, key);

        if (value !== 0) {
            stats[key] = value;
        }
    }

    return powerOf(
        item.type ?? item.itemType,
        item.level ?? 1,
        stats,
        item.effectData ?? (item.effectValue !== null ? { value: item.effectValue } : null),
    );
}
