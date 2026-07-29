/**
 * Port of `app/Game/Services/InventoryService.php`.
 */

import { getShop } from './catalog';
import { INVENTORY_SIZE } from './config';
import { GameError } from './errors';
import { recalculate } from './profile';
import { randomHex } from './rng';
import type { EquipmentSlot, GameProfile, Item, ItemEffect } from './types';

/** Pads/truncates the inventory to exactly `INVENTORY_SIZE` slots. */
export function normalizedInventory(profile: GameProfile): Array<Item | null> {
    const inventory = (profile.inventory ?? []).slice(0, INVENTORY_SIZE);

    while (inventory.length < INVENTORY_SIZE) {
        inventory.push(null);
    }

    return inventory;
}

export function addItem(profile: GameProfile, item: Item): boolean {
    const inventory = normalizedInventory(profile);

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

    const freeIndex = inventory.findIndex((slot) => slot === null);

    if (freeIndex < 0) {
        return false;
    }

    inventory[freeIndex] = { ...item, quantity: item.quantity ?? 1 };
    profile.inventory = inventory;

    return true;
}

export function buyItem(profile: GameProfile, shopId: string, itemId: string | number): void {
    const shop = getShop(shopId);

    if (!shop) {
        throw new GameError('Nie znaleziono sklepu.');
    }

    const item = shop.items.find((candidate) => String(candidate.id) === String(itemId));

    if (!item) {
        throw new GameError('Ten przedmiot nie istnieje w sklepie.');
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
    switch (item.type ?? item.itemType) {
        case 'weapon':
            return 'weapon';
        case 'armor':
            return 'armor';
        case 'talisman':
            return 'accessory';
        default:
            throw new GameError('Tego przedmiotu nie da się założyć.');
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
    profile.equipped = { ...profile.equipped, [slot]: item };
    profile.inventory = inventory;

    recalculate(profile);
}

export function unequip(profile: GameProfile, slot: EquipmentSlot): void {
    const item = profile.equipped[slot];

    if (!item) {
        throw new GameError('Ten slot ekwipunku jest pusty.');
    }

    profile.equipped = { ...profile.equipped, [slot]: null };

    if (!addItem(profile, item)) {
        profile.equipped = { ...profile.equipped, [slot]: item };

        throw new GameError('Ekwipunek jest pełny.');
    }

    recalculate(profile);
}

export function sell(profile: GameProfile, index: number): number {
    const inventory = normalizedInventory(profile);
    const item = inventory[index];

    if (!item) {
        throw new GameError('Ten slot jest pusty.');
    }

    const gold = Math.floor((item.price ?? 0) * 0.5);

    inventory[index] = null;
    profile.inventory = inventory;
    profile.gold += gold;

    return gold;
}

/** Consumes a potion from the given slot. Named to avoid the `use*` hook prefix. */
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
