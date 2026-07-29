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

/** Bonus stats for the tooltip, excluding the ones already shown as base stats. */
export function bonusRows(item: Item): BonusRow[] {
    return Object.entries(item.bonusStats ?? {})
        .filter(([key]) => !['dmgMin', 'dmgMax', 'armor', 'bagSlots'].includes(key))
        .map(([key, stat]) => {
            if (typeof stat === 'number') {
                return { key, value: stat, name: statName(key), suffix: statSuffix(key) };
            }

            return { key, value: stat.value, name: stat.name, suffix: stat.suffix };
        });
}
