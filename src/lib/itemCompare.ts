/**
 * "Is this better than what I am already wearing?"
 *
 * Turns a hovered item plus the player's equipment into the rows the tooltip
 * prints. The comparison is item against item rather than character sheet
 * against character sheet: the difference is the same for damage, armour and
 * health, and the item-level view is the one that survives the percentage caps
 * `recalculate` applies — an item does not stop being the better item just
 * because the wearer already sits on the crit ceiling.
 *
 * Nothing here knows about colours or markup; it only labels each row as a
 * gain, a loss or a plain up/down.
 */

import { inventorySize } from '@/game/bags';
import { equipmentSlotFor, itemStat } from '@/game/equipment';
import { itemPower } from '@/game/itemPower';
import type { EquipmentSlot, Item, PlayerView, StatKey } from '@/game/types';

import { statName, statSuffix } from './format';

/** How the hovered item's value relates to the equipped one's. */
export type ComparisonState =
    /** Both carry the stat, the hovered item has more. */
    | 'better'
    /** Both carry the stat, the hovered item has less. */
    | 'worse'
    | 'equal'
    /** The equipped item does not have this stat at all. */
    | 'gained'
    /** The equipped item has it and the hovered one does not — it falls away. */
    | 'lost';

export type ComparisonRow = {
    key: string;
    label: string;
    /** What is worn right now, formatted; null when the equipped item lacks it. */
    current: string | null;
    /** What the hovered item offers; null when it lacks the stat. */
    candidate: string | null;
    /** Signed difference, formatted — positive means the hovered item wins. */
    delta: string;
    state: ComparisonState;
};

export type ItemComparison = {
    slot: EquipmentSlot;
    /** What occupies the slot today, or null when it is empty. */
    equipped: Item | null;
    /** The hovered item *is* the equipped one, so there is nothing to compare. */
    wearing: boolean;
    rows: ComparisonRow[];
    /**
     * Difference in item power — the one-number answer to "is this better?".
     *
     * Recomputed from both items rather than read off their stored `power`: a
     * character carries pieces from every version of the formula they ever
     * played through, and two figures from two formulas do not subtract.
     */
    powerDelta: number;
    /** Above the player's level, so it cannot be worn yet. */
    levelLocked: boolean;
    /** A bag so small that equipping it would push items out of the backpack. */
    bagTooSmall: boolean;
};

/** Player fields the comparison reads — a `PlayerView`, but testable without one. */
type ComparisonContext = Pick<PlayerView, 'equipped' | 'inventory' | 'level'>;

/**
 * Compared in this order, so two tooltips list the same stats the same way.
 * Damage is handled apart from these: it is a range, not a single number.
 */
const COMPARED_STATS: StatKey[] = [
    'armor',
    'hp',
    'critChance',
    'critPower',
    'dodge',
    'stun',
    'strength',
    'doubleDamage',
    'doubleArmor',
    'bagSlots',
];

export function compareWithEquipped(item: Item, user: ComparisonContext): ItemComparison | null {
    const slot = equipmentSlotFor(item);

    // Potions are drunk, not worn — there is nothing to hold them against.
    if (!slot) {
        return null;
    }

    const equipped = user.equipped[slot] ?? null;
    const wearing = equipped !== null && equipped.id === item.id;

    return {
        slot,
        equipped,
        wearing,
        rows: wearing ? [] : buildRows(item, equipped),
        powerDelta: itemPower(item) - (equipped ? itemPower(equipped) : 0),
        levelLocked: (item.level ?? 1) > user.level,
        bagTooSmall: slot === 'bag' && !wearing && bagWouldSpill(item, user),
    };
}

function buildRows(item: Item, equipped: Item | null): ComparisonRow[] {
    const rows: ComparisonRow[] = [];
    const damage = damageRow(item, equipped);

    if (damage) {
        rows.push(damage);
    }

    for (const key of COMPARED_STATS) {
        const candidate = itemStat(item, key);
        const current = itemStat(equipped, key);

        // Neither side has it: not worth a line.
        if (candidate === 0 && current === 0) {
            continue;
        }

        const suffix = statSuffix(key);

        rows.push({
            key,
            label: statName(key),
            current: current === 0 ? null : `${current}${suffix}`,
            candidate: candidate === 0 ? null : `${candidate}${suffix}`,
            delta: formatDelta(candidate - current, suffix),
            state: stateFor(candidate, current),
        });
    }

    return rows;
}

/**
 * Damage is one row, not two.
 *
 * Splitting min and max apart reads as two unrelated stats; the range is what
 * the player thinks in. The delta is the difference of the two averages, which
 * is exactly what the swap changes — the strength addend `recalculate` puts on
 * top cancels out.
 */
function damageRow(item: Item, equipped: Item | null): ComparisonRow | null {
    const candidateMin = itemStat(item, 'dmgMin');
    const candidateMax = itemStat(item, 'dmgMax');
    const currentMin = itemStat(equipped, 'dmgMin');
    const currentMax = itemStat(equipped, 'dmgMax');

    const candidateAverage = (candidateMin + candidateMax) / 2;
    const currentAverage = (currentMin + currentMax) / 2;

    if (candidateAverage === 0 && currentAverage === 0) {
        return null;
    }

    return {
        key: 'damage',
        label: 'Obrażenia',
        current: currentAverage === 0 ? null : `${currentMin}-${currentMax}`,
        candidate: candidateAverage === 0 ? null : `${candidateMin}-${candidateMax}`,
        delta: formatDelta(candidateAverage - currentAverage, ''),
        state: stateFor(candidateAverage, currentAverage),
    };
}

function stateFor(candidate: number, current: number): ComparisonState {
    if (candidate === 0) {
        return current === 0 ? 'equal' : 'lost';
    }

    if (current === 0) {
        return 'gained';
    }

    if (candidate === current) {
        return 'equal';
    }

    return candidate > current ? 'better' : 'worse';
}

/** `4.5` → `+4,5`, `-3` → `−3%`, `0` → `±0`. Polish writes decimals with a comma. */
export function formatDelta(value: number, suffix = ''): string {
    const rounded = Math.round(value * 10) / 10;

    if (rounded === 0) {
        return `±0${suffix}`;
    }

    const sign = rounded > 0 ? '+' : '−';

    return `${sign}${String(Math.abs(rounded)).replace('.', ',')}${suffix}`;
}

/**
 * Mirrors the refusal in `inventory.equip`: a smaller bag shrinks the grid, and
 * the slots that fall away may still be occupied. Warning about it in the
 * tooltip beats finding out through an error modal after the click.
 */
function bagWouldSpill(bag: Item, user: Pick<PlayerView, 'equipped' | 'inventory'>): boolean {
    const size = inventorySize({ ...user.equipped, bag });
    const inventory = [...user.inventory];
    const index = inventory.findIndex((slot) => slot?.id === bag.id);

    // Equipping swaps: the bag leaves its slot and the worn one drops into it.
    // A bag that is not in the backpack at all (shop stock) simply leaves the
    // grid as it is.
    if (index >= 0) {
        inventory[index] = user.equipped.bag;
    }

    return inventory.some((slot, position) => position >= size && slot !== null);
}
