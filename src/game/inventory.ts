/**
 * Port of `app/Game/Services/InventoryService.php`.
 */

import { inventorySize } from './bags';
import { equipmentSlotFor } from './equipment';
import { GameError } from './errors';
import { recalculate } from './profile';
import { randomHex } from './rng';
import { requireShop } from './shops';
import type { Equipped, EquipmentSlot, GameProfile, Item, ItemEffect } from './types';

/** Index of the last slot still holding something, or -1 when empty. */
function lastUsedSlot(inventory: ReadonlyArray<Item | null>): number {
    for (let index = inventory.length - 1; index >= 0; index--) {
        if (inventory[index]) {
            return index;
        }
    }

    return -1;
}

/**
 * Pads the inventory to the profile's current slot count.
 *
 * It never truncates away an occupied slot: losing a bag has to be refused by
 * `equip`/`unequip`, not silently swallow the items that no longer fit. Slots
 * past the current size can therefore exist for a moment, and `addItem` simply
 * refuses to fill them.
 */
export function normalizedInventory(profile: GameProfile): Array<Item | null> {
    const raw = profile.inventory ?? [];
    const length = Math.max(inventorySize(profile.equipped), lastUsedSlot(raw) + 1);
    const inventory = raw.slice(0, length);

    while (inventory.length < length) {
        inventory.push(null);
    }

    return inventory;
}

export function addItem(profile: GameProfile, item: Item): boolean {
    const inventory = normalizedInventory(profile);
    const size = inventorySize(profile.equipped);

    if (item.stackable === true) {
        const existingIndex = inventory.findIndex((slot) => slot?.id === item.id);

        if (existingIndex >= 0) {
            const existing = inventory[existingIndex]!;
            inventory[existingIndex] = {
                ...existing,
                quantity: (existing.quantity ?? 1) + (item.quantity ?? 1),
            };
            profile.inventory = inventory;

            return true;
        }
    }

    const freeIndex = inventory.findIndex((slot, index) => index < size && slot === null);

    if (freeIndex < 0) {
        return false;
    }

    inventory[freeIndex] = { ...item, quantity: item.quantity ?? 1 };
    profile.inventory = inventory;

    return true;
}

export function buyItem(profile: GameProfile, shopId: string, itemId: string | number): void {
    const shop = requireShop(shopId);
    const item = shop.items.find((candidate) => String(candidate.id) === String(itemId));

    if (!item) {
        throw new GameError('Ten przedmiot nie istnieje w sklepie.');
    }

    // A town stocks its whole ten-level band, so its top shelf is above the head
    // of anyone who has just arrived. That is the point — you can see what the
    // land is worth working towards — but it is not for sale yet. The rule lives
    // here rather than in the shop screen so it holds however the buy is asked
    // for.
    if (profile.level < (item.level ?? 1)) {
        throw new GameError(`Ten przedmiot wymaga ${item.level} poziomu.`);
    }

    if (profile.gold < item.price) {
        throw new GameError('Masz za mało złota.');
    }

    // Give the copy its own id so stacking/selling can address it individually.
    const copy: Item = {
        ...item,
        id: `${item.id}_${randomHex(6)}`,
        shopItemId: item.id,
    };

    if (!addItem(profile, copy)) {
        throw new GameError('Ekwipunek jest pełny.');
    }

    profile.gold -= item.price;
}

function slotForItem(item: Item): EquipmentSlot {
    const slot = equipmentSlotFor(item);

    if (!slot) {
        throw new GameError('Tego przedmiotu nie da się założyć.');
    }

    return slot;
}

/**
 * Refuses a bag change that would leave items outside the backpack.
 *
 * Swapping down to a smaller bag — or taking one off entirely — shrinks the
 * grid, and the slots that fall away may still be occupied. Dropping those
 * items silently would be the worst possible outcome, so the change is
 * rejected and the player is told to make room first.
 */
function assertNothingFallsOut(
    inventory: ReadonlyArray<Item | null>,
    equipped: Equipped,
    message: string,
): void {
    const size = inventorySize(equipped);

    if (inventory.some((slot, index) => index >= size && slot !== null)) {
        throw new GameError(message);
    }
}

export function equip(profile: GameProfile, index: number): void {
    const inventory = normalizedInventory(profile);
    const item = inventory[index];

    if (!item) {
        throw new GameError('Ten slot jest pusty.');
    }

    const slot = slotForItem(item);

    // Swap: whatever was equipped drops into the slot the item came from.
    inventory[index] = profile.equipped[slot];

    const equipped: Equipped = { ...profile.equipped, [slot]: item };

    if (slot === 'bag') {
        assertNothingFallsOut(
            inventory,
            equipped,
            'Ta torba jest za mała — najpierw zrób miejsce w plecaku.',
        );
    }

    profile.equipped = equipped;
    profile.inventory = inventory;
    // Re-run now that the size may have changed, so a downgrade drops the
    // empty tail slots and an upgrade pads the new ones.
    profile.inventory = normalizedInventory(profile);

    recalculate(profile);
}

export function unequip(profile: GameProfile, slot: EquipmentSlot): void {
    const item = profile.equipped[slot];

    if (!item) {
        throw new GameError('Ten slot ekwipunku jest pusty.');
    }

    if (slot === 'bag') {
        assertNothingFallsOut(
            normalizedInventory(profile),
            { ...profile.equipped, bag: null },
            'Bez torby część przedmiotów nie zmieściłaby się w plecaku.',
        );
    }

    profile.equipped = { ...profile.equipped, [slot]: null };

    if (!addItem(profile, item)) {
        profile.equipped = { ...profile.equipped, [slot]: item };

        throw new GameError('Ekwipunek jest pełny.');
    }

    profile.inventory = normalizedInventory(profile);

    recalculate(profile);
}

/** Shops pay half of an item's value. Shared so "sell all" cannot drift from it. */
export function sellValue(item: Item): number {
    return Math.floor((item.price ?? 0) * 0.5);
}

export function sell(profile: GameProfile, index: number): number {
    const inventory = normalizedInventory(profile);
    const item = inventory[index];

    if (!item) {
        throw new GameError('Ten slot jest pusty.');
    }

    const gold = sellValue(item);

    inventory[index] = null;
    profile.inventory = inventory;
    profile.gold += gold;

    return gold;
}

/** Consumes a potion from the given slot. Named to avoid the `use*` hook prefix. */
/**
 * Sells every item in the backpack and returns the gold earned.
 *
 * Equipped gear is untouched — only the 15 backpack slots are cleared.
 */
export function sellAll(profile: GameProfile): { gold: number; count: number } {
    const inventory = normalizedInventory(profile);
    let gold = 0;
    let count = 0;

    for (let index = 0; index < inventory.length; index++) {
        const item = inventory[index];

        if (!item) {
            continue;
        }

        gold += sellValue(item);
        count++;
        inventory[index] = null;
    }

    if (count === 0) {
        throw new GameError('Plecak jest pusty.');
    }

    profile.inventory = inventory;
    profile.gold += gold;

    return { gold, count };
}

export function consumeItem(profile: GameProfile, index: number, now: number = Date.now()): void {
    const inventory = normalizedInventory(profile);
    const item = inventory[index];

    if (!item || (item.type ?? item.itemType) !== 'potion') {
        throw new GameError('Tego przedmiotu nie da się użyć.');
    }

    const effect: ItemEffect | null =
        item.effectData ??
        (item.effect ? { type: item.effect, value: item.effectValue ?? 0 } : null);

    applyEffect(profile, effect, now);

    if ((item.quantity ?? 1) > 1) {
        inventory[index] = { ...item, quantity: (item.quantity ?? 1) - 1 };
    } else {
        inventory[index] = null;
    }

    profile.inventory = inventory;

    if (effect && ['buff_strength', 'buff_all'].includes(effect.type)) {
        recalculate(profile);
    }
}

function applyEffect(profile: GameProfile, effect: ItemEffect | null, now: number): void {
    if (!effect) {
        return;
    }

    const value = Math.trunc(effect.value ?? 0);

    switch (effect.type) {
        case 'pa':
            profile.pa += Math.max(0, value);
            profile.paRegeneratedAt = now;
            break;
        case 'buff_strength':
            profile.strength += value;
            break;
        case 'buff_crit':
            profile.critChance += value;
            break;
        case 'buff_armor':
            profile.armor += value;
            break;
        case 'buff_all':
            profile.strength += Math.floor(value / 2);
            profile.vitality += Math.floor(value / 2);
            profile.luck += Math.floor(value / 3);
            break;
        default:
            break;
    }
}
