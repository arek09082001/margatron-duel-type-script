/**
 * Reading an item: which slot it goes into, and what a stat on it is worth.
 *
 * Both answers were duplicated — `inventory` had its own slot switch and
 * `profile` its own stat reader — and the tooltip comparison needs the very
 * same two. They live here so a stat is resolved the same way everywhere.
 */

import type { EquipmentSlot, Item, StatKey } from './types';

/**
 * Reads a stat from an item, checking the flattened root first and then the
 * `stats` / `bonusStats` bags — bonus stats may be either a raw number or a
 * `{ value, name, suffix }` descriptor.
 */
export function itemStat(item: Item | null | undefined, key: StatKey): number {
    if (!item) {
        return 0;
    }

    const sources: Array<Record<string, unknown> | undefined> = [
        item as unknown as Record<string, unknown>,
        item.stats as Record<string, unknown> | undefined,
        item.bonusStats as Record<string, unknown> | undefined,
    ];

    for (const source of sources) {
        if (!source || !(key in source)) {
            continue;
        }

        const value = source[key];

        if (value && typeof value === 'object' && 'value' in value) {
            const nested = (value as { value: unknown }).value;

            return typeof nested === 'number' ? nested : 0;
        }

        return typeof value === 'number' ? value : 0;
    }

    return 0;
}

/** The slot an item is worn in, or null for something that cannot be worn. */
export function equipmentSlotFor(item: Item | null | undefined): EquipmentSlot | null {
    switch (item?.type ?? item?.itemType) {
        case 'weapon':
            return 'weapon';
        case 'armor':
            return 'armor';
        case 'talisman':
            return 'accessory';
        case 'bag':
            return 'bag';
        default:
            return null;
    }
}
