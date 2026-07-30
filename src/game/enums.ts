/**
 * Port of `app/Game/Enums` + `app/Game/Attributes`. PHP attached metadata to
 * enum cases through attributes; here each enum is a value union with a
 * companion metadata record.
 */

import type {
    ArenaDifficultyValue,
    ItemRarityValue,
    ItemTypeValue,
    PlayerAttributeKey,
} from './types';

export const ITEM_TYPES: ItemTypeValue[] = ['weapon', 'armor', 'talisman', 'potion', 'bag'];

export const ITEM_TYPE_LABELS: Record<ItemTypeValue, string> = {
    weapon: 'Broń',
    armor: 'Zbroja',
    talisman: 'Talizman',
    potion: 'Mikstura',
    bag: 'Torba',
};

/**
 * How often each type comes out of a drop roll.
 *
 * Gear used to be picked uniformly from `ITEM_TYPES`. Bags are a lasting
 * upgrade rather than a sidegrade — one carries you for many levels — so they
 * are deliberately the rarest thing a monster can leave behind.
 */
export const ITEM_TYPE_DROP_WEIGHTS: Record<ItemTypeValue, number> = {
    weapon: 30,
    armor: 30,
    talisman: 27,
    potion: 8,
    bag: 5,
};

export type RarityMeta = {
    label: string;
    color: string;
    cssClass: string;
    /** Multiplier on the level curve — damage, armour and health. */
    statMultiplier: number;
    /** Multiplier on the percentage bonus stats, which do not follow the curve. */
    percentMultiplier: number;
    priceMultiplier: number;
    bonusStats: number;
    /** Extra backpack slots on top of the bag model's own capacity. */
    bagSlotBonus: number;
};

/** Ordered weakest → strongest; the drop roll walks this order. */
export const ITEM_RARITIES: ItemRarityValue[] = ['common', 'unique', 'heroic', 'legendary'];

/**
 * The stat multipliers are deliberately tighter than the old 1,0 / 1,3 / 1,6 /
 * 2,0. Gear grows by roughly 5,5% a level in the late game, so a doubling made a
 * lucky legendary worth thirteen levels of progress and left everything found in
 * between meaningless. At 1,7 it is still the best thing that can happen to a
 * fight, just not the end of looting.
 */
export const RARITY_META: Record<ItemRarityValue, RarityMeta> = {
    common: {
        label: 'Zwykły',
        color: '#ffffff',
        cssClass: '',
        statMultiplier: 1.0,
        percentMultiplier: 1.0,
        priceMultiplier: 1.0,
        bonusStats: 0,
        bagSlotBonus: 0,
    },
    unique: {
        label: 'Unikalny',
        color: '#66cc66',
        cssClass: 'unique',
        statMultiplier: 1.18,
        percentMultiplier: 1.1,
        priceMultiplier: 2.5,
        bonusStats: 1,
        bagSlotBonus: 1,
    },
    heroic: {
        label: 'Heroiczny',
        color: '#2090fe',
        cssClass: 'heroic',
        statMultiplier: 1.4,
        percentMultiplier: 1.25,
        priceMultiplier: 5.0,
        bonusStats: 2,
        bagSlotBonus: 2,
    },
    legendary: {
        label: 'Legendarny',
        color: '#fa9a20',
        cssClass: 'legendary',
        statMultiplier: 1.7,
        percentMultiplier: 1.45,
        priceMultiplier: 10.0,
        bonusStats: 3,
        bagSlotBonus: 3,
    },
};

export type ArenaDifficultyMeta = {
    label: string;
    levelBonus: number;
    dropRate: number;
    rarityBonus: number;
    paCost: number;
};

export const ARENA_DIFFICULTIES: ArenaDifficultyValue[] = ['easy', 'medium', 'hard'];

export const ARENA_DIFFICULTY_META: Record<ArenaDifficultyValue, ArenaDifficultyMeta> = {
    easy: { label: 'Łatwa', levelBonus: 0, dropRate: 1.0, rarityBonus: 0, paCost: 1 },
    medium: { label: 'Średnia', levelBonus: 3, dropRate: 1.3, rarityBonus: 5, paCost: 2 },
    hard: { label: 'Trudna', levelBonus: 6, dropRate: 1.6, rarityBonus: 15, paCost: 3 },
};

export const PLAYER_ATTRIBUTES: PlayerAttributeKey[] = ['vitality', 'strength', 'luck'];

export const PLAYER_ATTRIBUTE_LABELS: Record<PlayerAttributeKey, string> = {
    vitality: 'Witalność',
    strength: 'Siła',
    luck: 'Szczęście',
};

export type MapMeta = {
    id: number;
    name: string;
    image: string;
    levelMin: number;
    levelMax: number;
    requiredLevel: number;
};

export const MAP_META: Record<number, MapMeta> = {
    1: { id: 1, name: 'Ithan', image: 'maps/ithan.png', levelMin: 1, levelMax: 10, requiredLevel: 1 },
    2: { id: 2, name: 'Torneg', image: 'maps/torneg.png', levelMin: 11, levelMax: 20, requiredLevel: 9 },
    3: {
        id: 3,
        name: 'Karka-han',
        image: 'maps/karka-han.png',
        levelMin: 21,
        levelMax: 30,
        requiredLevel: 20,
    },
    4: { id: 4, name: 'Werbin', image: 'maps/werbin.png', levelMin: 31, levelMax: 40, requiredLevel: 30 },
    // Late game. Same shape as the first four: ten levels per land, the gate
    // sitting on the previous land's last level.
    5: { id: 5, name: 'Eaquia', image: 'maps/eaquia.png', levelMin: 41, levelMax: 50, requiredLevel: 40 },
    6: { id: 6, name: 'Nithal', image: 'maps/nithal.png', levelMin: 51, levelMax: 60, requiredLevel: 50 },
    7: { id: 7, name: 'Tuzmer', image: 'maps/tuzmer.png', levelMin: 61, levelMax: 70, requiredLevel: 60 },
    8: { id: 8, name: 'Thuzal', image: 'maps/thuzal.png', levelMin: 71, levelMax: 80, requiredLevel: 70 },
    9: { id: 9, name: 'Hilaia', image: 'maps/hilaia.png', levelMin: 81, levelMax: 90, requiredLevel: 80 },
    10: { id: 10, name: 'Elizja', image: 'maps/elizja.png', levelMin: 91, levelMax: 100, requiredLevel: 90 },
};

export type AchievementMetric =
    | 'level'
    | 'played_seconds'
    | 'vitality_assigned'
    | 'strength_assigned'
    | 'luck_assigned'
    | 'damage'
    | 'armor'
    | 'stun'
    | 'monsters_killed'
    | 'unique_items_found'
    | 'heroic_items_found'
    | 'legendary_items_found';

export type AchievementMeta = {
    id: string;
    label: string;
    metric: AchievementMetric;
    target: number;
    icon: string;
    unit: string;
};

export const ACHIEVEMENTS: AchievementMeta[] = [
    { id: 'reach_level_20', label: 'Osiągnij poziom 20', metric: 'level', target: 20, icon: '⚜', unit: '' },
    {
        id: 'play_five_hours',
        label: 'Graj w grę 5h',
        metric: 'played_seconds',
        target: 18_000,
        icon: '⏳',
        unit: 's',
    },
    {
        id: 'assign_vitality_10',
        label: 'Przydziel 10p w witalność',
        metric: 'vitality_assigned',
        target: 10,
        icon: '♥',
        unit: '',
    },
    {
        id: 'assign_strength_10',
        label: 'Przydziel 10p w siłę',
        metric: 'strength_assigned',
        target: 10,
        icon: '✊',
        unit: '',
    },
    {
        id: 'assign_luck_5',
        label: 'Przydziel 5p w szczęście',
        metric: 'luck_assigned',
        target: 5,
        icon: '☘',
        unit: '',
    },
    { id: 'reach_damage_20', label: 'Uzyskaj 20p obrażeń', metric: 'damage', target: 20, icon: '⚔', unit: '' },
    { id: 'reach_armor_10', label: 'Uzyskaj 10p pancerza', metric: 'armor', target: 10, icon: '🛡', unit: '' },
    { id: 'reach_stun_32', label: 'Uzyskaj 32% ogłuszenia', metric: 'stun', target: 32, icon: '☠', unit: '%' },
    {
        id: 'kill_monsters_1000',
        label: 'Zabij 1000 potworów',
        metric: 'monsters_killed',
        target: 1000,
        icon: '⚔',
        unit: '',
    },
    {
        id: 'find_unique_items_100',
        label: 'Zdobądź 100 przedmiotów unikalnych',
        metric: 'unique_items_found',
        target: 100,
        icon: '✳',
        unit: '',
    },
    {
        id: 'find_heroic_items_10',
        label: 'Zdobądź 10 przedmiotów heroicznych',
        metric: 'heroic_items_found',
        target: 10,
        icon: '✦',
        unit: '',
    },
    {
        id: 'find_legendary_items_5',
        label: 'Zdobądź 5 przedmiotów legendarnych',
        metric: 'legendary_items_found',
        target: 5,
        icon: '✺',
        unit: '',
    },
];
