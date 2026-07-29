/**
 * Backpack capacity.
 *
 * Its own module because both `inventory` and `profile` need it, and those two
 * already import each other — putting it in either would close the cycle.
 */

import { INVENTORY_SIZE, MAX_BAG_SLOTS, MAX_INVENTORY_SIZE } from './config';
import type { Equipped, Item } from './types';

/**
 * Extra backpack slots a bag grants.
 *
 * Reads the flattened root first and then the `stats` bag, the same order
 * `recalculate` uses — shop items spread their stats onto the root, generated
 * drops carry them in `stats`, and an old save may have either.
 */
export function bagSlots(item: Item | null | undefined): number {
    if (!item) {
        return 0;
    }

    const raw = item.bagSlots ?? item.stats?.bagSlots ?? 0;

    return Math.min(MAX_BAG_SLOTS, Math.max(0, Math.floor(raw)));
}

/** Backpack slots a set of equipment grants: the base size plus its bag. */
export function inventorySize(equipped: Partial<Equipped> | null | undefined): number {
    return Math.min(MAX_INVENTORY_SIZE, INVENTORY_SIZE + bagSlots(equipped?.bag));
}
