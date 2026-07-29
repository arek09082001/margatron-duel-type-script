/**
 * Port of `app/Game/Services/ItemFactory.php` — drop rolls, rarity weighting
 * and procedural item generation.
 */

import {
    BASE_DROP_CHANCES,
    ITEM_BASES,
    POTION_EFFECT_RANGES,
    RARITY_PREFIXES,
    assetUrl,
    type ItemBase,
} from './catalog';
import { MAX_BAG_SLOTS } from './config';
import {
    ARENA_DIFFICULTY_META,
    ITEM_RARITIES,
    ITEM_TYPES,
    ITEM_TYPE_DROP_WEIGHTS,
    ITEM_TYPE_LABELS,
    RARITY_META,
} from './enums';
import { percentRoll, pick, pickWeighted, randomId, randomInt, shuffled } from './rng';
import type {
    ArenaDifficultyValue,
    BonusStat,
    Item,
    ItemEffect,
    ItemRarityValue,
    ItemStats,
    ItemTypeValue,
    StatKey,
} from './types';

type BonusStatDefinition = {
    key: StatKey;
    name: string;
    suffix: string;
    min: number;
    max: number;
};

const BONUS_STAT_POOL: Record<ItemTypeValue, BonusStatDefinition[]> = {
    weapon: [
        { key: 'critChance', name: 'Szansa krytyka', suffix: '%', min: 1, max: 5 },
        { key: 'critPower', name: 'Moc krytyka', suffix: '%', min: 5, max: 20 },
        { key: 'stun', name: 'Ogłuszenie', suffix: '%', min: 1, max: 3 },
    ],
    armor: [
        { key: 'hp', name: 'Punkty życia', suffix: '', min: 5, max: 20 },
        { key: 'dodge', name: 'Unik', suffix: '%', min: 1, max: 4 },
    ],
    talisman: [
        { key: 'hp', name: 'Punkty życia', suffix: '', min: 5, max: 25 },
        { key: 'critChance', name: 'Szansa krytyka', suffix: '%', min: 1, max: 6 },
        { key: 'critPower', name: 'Moc krytyka', suffix: '%', min: 5, max: 25 },
        { key: 'dodge', name: 'Unik', suffix: '%', min: 1, max: 5 },
        { key: 'stun', name: 'Ogłuszenie', suffix: '%', min: 1, max: 4 },
    ],
    potion: [],
    // A bag's whole value is its capacity; combat rolls would only muddy it.
    bag: [],
};

export function rollForDrop(
    enemyLevel: number,
    playerLuck = 0,
    arenaDifficulty: ArenaDifficultyValue | null = null,
): Item | null {
    const dropRate = arenaDifficulty ? ARENA_DIFFICULTY_META[arenaDifficulty].dropRate : 1;
    const dropChance = Math.min(85, (40 + playerLuck) * dropRate);

    if (percentRoll() > dropChance) {
        return null;
    }

    return generateItem(enemyLevel, { luckBonus: playerLuck, arenaDifficulty });
}

export function generateItem(
    level: number,
    options: {
        forcedRarity?: ItemRarityValue;
        forcedType?: ItemTypeValue;
        luckBonus?: number;
        arenaDifficulty?: ArenaDifficultyValue | null;
    } = {},
): Item {
    const { forcedRarity, forcedType, luckBonus = 0, arenaDifficulty = null } = options;

    const rarity = forcedRarity ?? rollRarity(luckBonus, arenaDifficulty);
    const type = forcedType ?? pickWeighted(ITEM_TYPES, (candidate) => ITEM_TYPE_DROP_WEIGHTS[candidate]);
    const base = pickBase(type, level);
    const meta = RARITY_META[rarity];
    const prefixes = RARITY_PREFIXES[rarity] ?? [];
    const prefix = rarity === 'common' || prefixes.length === 0 ? '' : `${pick(prefixes)} `;

    let stats: ItemStats = {};
    let bonusStats: Record<string, BonusStat> = {};
    let effect: ItemEffect | null = null;

    if (type === 'weapon') {
        const scale = 1 + level * 0.15;
        stats = {
            dmgMin: Math.max(1, Math.floor((base.dmgMin ?? 0) * scale * meta.statMultiplier)),
            dmgMax: Math.max(2, Math.floor((base.dmgMax ?? 0) * scale * meta.statMultiplier)),
        };
        bonusStats = generateBonusStats(type, meta.bonusStats, level, meta.statMultiplier);
        stats = { ...stats, ...flattenBonusStats(bonusStats) };
    } else if (type === 'armor') {
        const scale = 1 + level * 0.12;
        stats = {
            armor: Math.max(1, Math.floor((base.armor ?? 0) * scale * meta.statMultiplier)),
        };
        bonusStats = generateBonusStats(type, meta.bonusStats, level, meta.statMultiplier);
        stats = { ...stats, ...flattenBonusStats(bonusStats) };
    } else if (type === 'talisman') {
        bonusStats = generateBonusStats(type, Math.max(1, meta.bonusStats), level, meta.statMultiplier);
        stats = flattenBonusStats(bonusStats);
    } else if (type === 'bag') {
        stats = { bagSlots: bagCapacity(base, meta.statMultiplier) };
    } else {
        const baseEffect = (base as ItemBase).effect;
        effect = baseEffect
            ? { type: baseEffect.type, value: rollPotionEffect(baseEffect.type, rarity) }
            : null;
    }

    const power = itemPower(type, stats, effect, meta.statMultiplier);

    return {
        id: randomId('drop_'),
        name: `${prefix}${base.name}`,
        icon: base.image,
        image: base.image,
        imageUrl: assetUrl(base.image),
        type,
        itemType: type,
        itemTypeName: ITEM_TYPE_LABELS[type],
        rarity,
        rarityName: meta.label,
        rarityColor: meta.color,
        rarityCss: meta.cssClass,
        level,
        stats,
        bonusStats,
        effect: effect?.type ?? null,
        effectValue: effect?.value ?? null,
        effectData: effect,
        power,
        price: Math.floor(power * meta.priceMultiplier),
        quantity: 1,
        ...stats,
    };
}

/**
 * Picks the base item, honouring the level gate bags carry.
 *
 * Everything else scales its stats with the level it dropped at, so any base
 * works at any level. A bag's capacity is fixed, which would let a level 1
 * kill hand out a backpack — hence the filter.
 */
function pickBase(type: ItemTypeValue, level: number): ItemBase {
    const bases = ITEM_BASES[type];

    if (type !== 'bag') {
        return pick(bases);
    }

    const unlocked = bases.filter((base) => (base.minLevel ?? 1) <= level);

    return unlocked.length > 0 ? pick(unlocked) : bases[0];
}

function bagCapacity(base: ItemBase, rarityMultiplier: number): number {
    return Math.min(MAX_BAG_SLOTS, Math.max(1, Math.floor((base.bagSlots ?? 1) * rarityMultiplier)));
}

function rollPotionEffect(effectType: string, rarity: ItemRarityValue): number {
    const ranges = POTION_EFFECT_RANGES[effectType];

    if (!ranges) {
        return 1;
    }

    const [min, max] = ranges[rarity];

    return randomInt(min, max);
}

/**
 * Luck and arena difficulty push weight from common towards the rarer tiers.
 * The tiers are capped so the cumulative chance never exceeds 100%.
 */
function rollRarity(luckBonus: number, arenaDifficulty: ArenaDifficultyValue | null): ItemRarityValue {
    const luckMod = Math.sqrt(Math.max(0, luckBonus)) * 2;
    const arenaBonus = arenaDifficulty ? ARENA_DIFFICULTY_META[arenaDifficulty].rarityBonus : 0;

    const legendaryWeight = BASE_DROP_CHANCES.legendary + luckMod * 0.1 + arenaBonus * 0.1;
    const heroicWeight = BASE_DROP_CHANCES.heroic + luckMod * 0.3 + arenaBonus * 0.3;
    const uniqueWeight = BASE_DROP_CHANCES.unique + luckMod * 0.6 + arenaBonus * 0.5;

    const legendaryChance = Math.min(100, legendaryWeight);
    const heroicChance =
        legendaryChance + heroicWeight <= 100 ? heroicWeight : Math.max(0, 100 - legendaryChance);
    const uniqueChance =
        legendaryChance + heroicChance + uniqueWeight <= 100
            ? uniqueWeight
            : Math.max(0, 100 - legendaryChance - heroicChance);
    const commonChance = Math.max(0, 100 - uniqueChance - heroicChance - legendaryChance);

    const chances: Record<ItemRarityValue, number> = {
        common: commonChance,
        unique: uniqueChance,
        heroic: heroicChance,
        legendary: legendaryChance,
    };

    const roll = percentRoll();
    let cursor = 0;

    for (const rarity of ITEM_RARITIES) {
        cursor += chances[rarity];

        if (roll <= cursor) {
            return rarity;
        }
    }

    return 'common';
}

function generateBonusStats(
    itemType: ItemTypeValue,
    count: number,
    level: number,
    rarityMultiplier: number,
): Record<string, BonusStat> {
    if (count <= 0) {
        return {};
    }

    const pool = BONUS_STAT_POOL[itemType];
    const selected = shuffled(pool).slice(0, Math.min(count, pool.length));
    const bonusStats: Record<string, BonusStat> = {};

    for (const definition of selected) {
        const value = Math.floor(
            randomInt(definition.min, definition.max) * (1 + level * 0.1) * rarityMultiplier,
        );

        bonusStats[definition.key] = {
            value: Math.max(1, value),
            name: definition.name,
            suffix: definition.suffix,
        };
    }

    return bonusStats;
}

function flattenBonusStats(bonusStats: Record<string, BonusStat>): ItemStats {
    const flattened: ItemStats = {};

    for (const [key, bonus] of Object.entries(bonusStats)) {
        flattened[key as StatKey] = bonus.value;
    }

    return flattened;
}

function itemPower(
    type: ItemTypeValue,
    stats: ItemStats,
    effect: ItemEffect | null,
    rarityMultiplier: number,
): number {
    const sum = Object.values(stats).reduce((total, value) => total + (value ?? 0), 0);

    switch (type) {
        case 'weapon':
            return Math.floor(((stats.dmgMin ?? 0) + (stats.dmgMax ?? 0)) * 5 * rarityMultiplier);
        case 'armor':
            return Math.floor((stats.armor ?? 1) * 8 * rarityMultiplier);
        case 'talisman':
            return Math.floor(Math.max(1, sum) * 3 * rarityMultiplier);
        case 'potion':
            return (effect?.value ?? 1) * 2;
        case 'bag':
            // Priced per slot rather than per stat point, so a bag is a real
            // gold sink instead of pocket change next to a weapon.
            return Math.floor((stats.bagSlots ?? 1) * 120 * rarityMultiplier);
    }
}
