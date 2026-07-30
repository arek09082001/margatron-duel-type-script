import type { Item } from '@/game/types';

/** `1234567` → `1 234 567`, matching the original thin-space grouping. */
export function formatNumber(value?: number): string {
    return (value ?? 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatCountdown(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;

    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export function itemImage(itemOrPath?: Item | string | null): string {
    if (!itemOrPath) {
        return '';
    }

    if (typeof itemOrPath === 'string') {
        return itemOrPath.startsWith('/game-assets/') ? itemOrPath : `/game-assets/${itemOrPath}`;
    }

    return itemOrPath.imageUrl ?? itemImage(itemOrPath.image);
}

const STAT_NAMES: Record<string, string> = {
    hp: 'Punkty życia',
    critChance: 'Szansa krytyka',
    critPower: 'Moc krytyka',
    dodge: 'Unik',
    stun: 'Ogłuszenie',
    strength: 'Siła',
    armor: 'Pancerz',
    doubleDamage: 'Podwójne obrażenia',
    doubleArmor: 'Podwójny pancerz',
    bagSlots: 'Miejsca w plecaku',
};

const PERCENT_STATS = ['critChance', 'critPower', 'dodge', 'stun', 'doubleDamage', 'doubleArmor'];

export function statName(key: string): string {
    return STAT_NAMES[key] ?? key;
}

export function statSuffix(key: string): string {
    return PERCENT_STATS.includes(key) ? '%' : '';
}

export type BonusRow = {
    key: string;
    value: number;
    name: string;
    suffix: string;
};

/** Rows the tooltip lists under the base stats it already prints itself. */
const BASE_STATS = ['dmgMin', 'dmgMax', 'armor', 'bagSlots'];

/**
 * Every stat worth a line in the tooltip.
 *
 * Reads `stats` as well as `bonusStats`: health is a base stat of armour and
 * talismans, not a rarity roll, so a common talisman carries it in `stats`
 * alone — listing only the bonus rolls left such an item looking empty.
 */
export function bonusRows(item: Item): BonusRow[] {
    const values = new Map<string, number>();

    for (const [key, value] of Object.entries(item.stats ?? {})) {
        if (typeof value === 'number') {
            values.set(key, value);
        }
    }

    for (const [key, stat] of Object.entries(item.bonusStats ?? {})) {
        values.set(key, typeof stat === 'number' ? stat : stat.value);
    }

    return [...values.entries()]
        .filter(([key]) => !BASE_STATS.includes(key))
        .map(([key, value]) => {
            const bonus = item.bonusStats?.[key];

            if (bonus && typeof bonus === 'object') {
                return { key, value, name: bonus.name, suffix: bonus.suffix };
            }

            return { key, value, name: statName(key), suffix: statSuffix(key) };
        });
}
