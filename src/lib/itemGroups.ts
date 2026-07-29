import type { Item, ItemTypeValue } from '@/game/types';

/** Section order in the shop: the slots a player fills, then consumables. */
const TYPE_ORDER: ItemTypeValue[] = ['weapon', 'armor', 'talisman', 'bag', 'potion'];

/** Plural headings — `ITEM_TYPE_LABELS` is singular and reads oddly as a header. */
export const ITEM_GROUP_LABELS: Record<ItemTypeValue, string> = {
    weapon: 'Broń',
    armor: 'Zbroje',
    talisman: 'Talizmany',
    potion: 'Mikstury',
    bag: 'Torby',
};

export type ItemGroup<T> = {
    type: ItemTypeValue;
    label: string;
    entries: T[];
};

/**
 * Groups items by equipment slot and orders each group weakest to strongest.
 *
 * `power` is the sort key rather than the level requirement: the level-scaled
 * stock always requires the player's current level, so sorting by level would
 * park the weakest gear in the shop at the very bottom. Level breaks ties, and
 * the name keeps the order stable for otherwise identical items.
 *
 * Generic over the entry so the sell tab can carry its inventory slot index
 * along and still address the right slot after sorting.
 */
export function groupItemsByType<T>(entries: T[], getItem: (entry: T) => Item): Array<ItemGroup<T>> {
    const buckets = new Map<ItemTypeValue, T[]>();

    for (const entry of entries) {
        const item = getItem(entry);
        const type = (item.type ?? item.itemType) as ItemTypeValue;
        const bucket = buckets.get(type);

        if (bucket) {
            bucket.push(entry);
        } else {
            buckets.set(type, [entry]);
        }
    }

    const groups: Array<ItemGroup<T>> = [];

    for (const type of TYPE_ORDER) {
        const bucket = buckets.get(type);

        if (!bucket || bucket.length === 0) {
            continue;
        }

        bucket.sort((left, right) => {
            const a = getItem(left);
            const b = getItem(right);

            return (
                (a.power ?? 0) - (b.power ?? 0) ||
                (a.level ?? 1) - (b.level ?? 1) ||
                a.name.localeCompare(b.name)
            );
        });

        groups.push({ type, label: ITEM_GROUP_LABELS[type], entries: bucket });
    }

    return groups;
}
