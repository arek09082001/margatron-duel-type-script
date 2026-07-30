/**
 * The one power curve every piece of level-scaled gear is derived from.
 *
 * Drops used to scale linearly (`1 + poziom * 0,15`) while enemies scale
 * linearly *on top of* a base that roughly doubles with every land — so the two
 * curves diverged fast. A level 40 drop was around a tenth of what that land's
 * shop sold, and by level 90 it was a fortieth. Loot stopped mattering somewhere
 * around level 25 and the run died in the mid fifties, because nothing you could
 * find or afford answered the enemies any more.
 *
 * The anchors below are read off the enemies a player of that level actually
 * fights (the strongest enemy of the best stage they can reach). They describe a
 * *common* piece at average quality; what a player ends up wearing is the best
 * of many drops, so rarity, quality and the base's own factor put the gear they
 * fight in at roughly 1,5× these numbers. The targets are set for that 1,5×:
 *
 * - `WEAPON_DAMAGE` ≈ HP przeciwnika / 11,5 — about six rounds to kill before
 *   crits, four to five with them.
 * - `ARMOUR` ≈ 0,30 × (obrażenia przeciwnika), so worn armour eats a little
 *   under half of an incoming hit. Armour is flat reduction: pushing it much
 *   higher makes the player unkillable rather than merely tough.
 * - `HEALTH` ≈ 3,2 × (obrażenia przeciwnika) — survive around nine hits while
 *   needing six to kill. Split between armour and talisman by their `health`
 *   factors, which add up to ≈ 1.
 * - `VALUE` ≈ 4 × the gold that enemy carries, so a sold drop is worth about two
 *   kills and loot roughly doubles gold income.
 *
 * Interpolation is geometric, so the curve is smooth even though the enemy
 * tables step up by ~50% at every land border. That is deliberate: a new land
 * hits hard on arrival and levels out as you farm it.
 */

type Anchor = readonly [level: number, value: number];

/**
 * The relationships the anchors below were read off, as numbers rather than
 * prose. `itemPower` values a stat by what it is worth against the enemy of the
 * item's level, and the only description of that enemy is the one these anchors
 * were built from — so the constants have to be readable, not just commented.
 */

/** Share of an incoming hit that a worn chest piece of the level eats. */
export const ARMOUR_SHARE_OF_HIT = 0.3;

/** Hits a weapon of the level needs to kill, before crits. */
export const WEAPON_HITS_TO_KILL = 11.5;

/**
 * What a player actually wears, relative to the common average the curve
 * describes: the best of many drops, so rarity, quality and the base's own
 * factor put it about half again above the line.
 */
export const WORN_GEAR_FACTOR = 1.5;

/** Damage of one hit from the enemy a player of this level is fighting. */
export function referenceEnemyHit(level: number): number {
    return armorBudget(level) / ARMOUR_SHARE_OF_HIT;
}

/** Average damage of a common, average-quality weapon of that level. */
const WEAPON_DAMAGE: readonly Anchor[] = [
    [1, 3],
    [10, 15],
    [20, 48],
    [30, 108],
    [40, 195],
    [50, 325],
    [60, 575],
    [70, 1000],
    [80, 1700],
    [90, 3300],
    [100, 5300],
];

/** Armour value of a common, average-quality chest piece of that level. */
const ARMOUR: readonly Anchor[] = [
    [1, 2],
    [10, 9],
    [20, 30],
    [30, 78],
    [40, 150],
    [50, 230],
    [60, 350],
    [70, 550],
    [80, 850],
    [90, 1400],
    [100, 2300],
];

/** Health a full set (armour + talisman) of that level is worth. */
const HEALTH: readonly Anchor[] = [
    [1, 10],
    [10, 110],
    [20, 370],
    [30, 980],
    [40, 1900],
    [50, 2600],
    [60, 3800],
    [70, 6000],
    [80, 9500],
    [90, 16000],
    [100, 26000],
];

/** Shop value of a common, average-quality item of that level. */
const VALUE: readonly Anchor[] = [
    [1, 40],
    [10, 130],
    [20, 400],
    [30, 1200],
    [40, 2900],
    [50, 8000],
    [60, 19000],
    [70, 43000],
    [80, 95000],
    [90, 215000],
    [100, 380000],
];

/**
 * Geometric interpolation between anchors.
 *
 * Geometric rather than linear because every one of these curves grows by a
 * factor per level, not by a step — linear interpolation would leave a visible
 * kink at each anchor.
 */
function interpolate(anchors: readonly Anchor[], level: number): number {
    const clamped = Math.max(1, level);

    if (clamped <= anchors[0][0]) {
        return anchors[0][1];
    }

    for (let index = 1; index < anchors.length; index++) {
        const [toLevel, toValue] = anchors[index];
        const [fromLevel, fromValue] = anchors[index - 1];

        if (clamped <= toLevel) {
            const progress = (clamped - fromLevel) / (toLevel - fromLevel);

            return fromValue * (toValue / fromValue) ** progress;
        }
    }

    // Past the last anchor: keep the growth rate of the final segment, so the
    // curve stays sane if a fight ever hands out a level above 100.
    const [lastLevel, lastValue] = anchors[anchors.length - 1];
    const [prevLevel, prevValue] = anchors[anchors.length - 2];
    const perLevel = (lastValue / prevValue) ** (1 / (lastLevel - prevLevel));

    return lastValue * perLevel ** (clamped - lastLevel);
}

export function weaponDamageBudget(level: number): number {
    return interpolate(WEAPON_DAMAGE, level);
}

export function armorBudget(level: number): number {
    return interpolate(ARMOUR, level);
}

export function healthBudget(level: number): number {
    return interpolate(HEALTH, level);
}

export function itemValueBudget(level: number): number {
    return interpolate(VALUE, level);
}
