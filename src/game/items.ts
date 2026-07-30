/**
 * Drop rolls: whether an enemy leaves anything behind, and how good it is.
 *
 * What the item *is* lives in `gear.ts`; this module only decides type, rarity
 * and quality, so the shop can build the very same items from the very same
 * curve without going through a random roll.
 */

import { BASE_DROP_CHANCES, POTION_EFFECT_RANGES } from './catalog';
import { MAX_BAG_SLOTS } from './config';
import {
    ARENA_DIFFICULTY_META,
    ITEM_RARITIES,
    ITEM_TYPES,
    ITEM_TYPE_DROP_WEIGHTS,
} from './enums';
import {
    type GearTypeValue,
    createBagItem,
    createGearItem,
    createPotionItem,
    rollQuality,
} from './gear';
import { percentRoll, pickWeighted, randomInt } from './rng';
import type { ArenaDifficultyValue, Item, ItemRarityValue, ItemTypeValue } from './types';

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

    if (type === 'bag') {
        return createBagItem({ level, rarity, maxSlots: MAX_BAG_SLOTS });
    }

    if (type === 'potion') {
        return createPotionItem({ level, rarity, value: rollPotionEffect('pa', rarity) });
    }

    return createGearItem({ type: type as GearTypeValue, level, rarity, quality: rollQuality() });
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
