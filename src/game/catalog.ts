/**
 * Port of `app/Game/Repositories/StaticGameCatalogRepository.php`.
 *
 * All content is static, so the maps/shops are built once at module load
 * instead of being rebuilt on every call like the PHP version did.
 */

import { STAGES_PER_LOCATION } from './config';
import { ARENA_DIFFICULTY_META, ITEM_TYPE_LABELS, MAP_META, RARITY_META } from './enums';
import { GameError } from './errors';
import type {
    ArenaDifficultyValue,
    Enemy,
    EnemyGroup,
    GameLocation,
    GameMapData,
    Item,
    ItemRarityValue,
    ItemStats,
    ItemTypeValue,
    LocationTypeValue,
    Npc,
    ScaledEnemy,
    Shop,
    Stage,
} from './types';

export function assetUrl(path: string): string {
    return `/game-assets/${path}`;
}

function npc(
    id: string,
    name: string,
    image: string,
    x: number,
    y: number,
    width: number,
    height: number,
): Npc {
    return { id, name, image, imageUrl: assetUrl(`npcs/${image}`), x, y, width, height };
}

function location(
    id: string,
    name: string,
    type: LocationTypeValue,
    image: string,
    x: number,
    y: number,
    width: number,
    height: number,
    pa = 1,
    extra: Partial<GameLocation> = {},
): GameLocation {
    return {
        id,
        name,
        type,
        image,
        imageUrl: assetUrl(`bg/${image}`),
        x,
        y,
        width,
        height,
        pa,
        ...extra,
    };
}

function battle(
    id: string,
    name: string,
    image: string,
    x: number,
    y: number,
    width: number,
    height: number,
    levelReq: number,
    levelMin: number,
    levelMax: number,
    enemies: string[],
    pa = 1,
): GameLocation {
    return location(id, name, 'battle', image, x, y, width, height, pa, {
        levelReq,
        levelMin,
        levelMax,
        enemies,
    });
}

function shopLocation(
    id: string,
    name: string,
    image: string,
    x: number,
    y: number,
    width: number,
    height: number,
    shopId: string,
): GameLocation {
    return location(id, name, 'shop', image, x, y, width, height, 1, { shopId });
}

function enemy(
    name: string,
    image: string,
    baseHp: number,
    dmgMin: number,
    dmgMax: number,
    exp: number,
    gold: number,
): Enemy {
    return {
        name,
        image,
        imageUrl: assetUrl(`monsters/${image}`),
        baseHp,
        dmgMin,
        dmgMax,
        exp,
        gold,
    };
}

function shopItem(
    id: number,
    name: string,
    image: string,
    type: ItemTypeValue,
    rarity: ItemRarityValue,
    level: number,
    stats: ItemStats,
    price: number,
    effect: { type: string; value: number } | null = null,
): Item {
    const meta = RARITY_META[rarity];
    const power = Math.max(1, Object.values(stats).reduce((total, value) => total + (value ?? 0), 0));

    return {
        id: String(id),
        name,
        icon: image,
        image,
        imageUrl: assetUrl(image),
        type,
        itemType: type,
        itemTypeName: ITEM_TYPE_LABELS[type],
        rarity,
        rarityName: meta.label,
        rarityColor: meta.color,
        rarityCss: meta.cssClass,
        level,
        stats,
        bonusStats: { ...stats },
        effect: effect?.type ?? null,
        effectValue: effect?.value ?? null,
        effectData: effect,
        power,
        price,
        quantity: 1,
        ...stats,
    };
}

function buildMap(
    id: number,
    data: Omit<GameMapData, 'id' | 'name' | 'image' | 'imageUrl' | 'requiredLevel' | 'levelRange'>,
): GameMapData {
    const meta = MAP_META[id];

    return {
        id,
        name: meta.name,
        image: meta.image,
        imageUrl: assetUrl(meta.image),
        requiredLevel: meta.requiredLevel,
        levelRange: { min: meta.levelMin, max: meta.levelMax },
        ...data,
    };
}

const ITHAN: GameMapData = buildMap(1, {
    npcs: [
        npc('ithan-npc-1', 'Makatara', 'npc233.gif', 2, 11.5, 32, 48),
        npc('ithan-npc-2', 'Roan', 'roan.gif', 21, 10.5, 32, 48),
        npc('ithan-npc-3', 'Bard Grant', 'npc232.gif', 3, 4.5, 32, 48),
        npc('ithan-npc-4', 'Sir Gallen', 'npc57.gif', 13, 4.5, 32, 48),
        npc('ithan-npc-5', 'Ognisko', 'ogn_barb02.gif', 19, 7, 32, 32),
    ],
    locations: [
        battle('ithan-yss', 'Dolina Yss', '009.jpg', 21.5, 2, 5, 4, 3, 6, 10, ['wolf', 'spider']),
        battle('ithan-hunters-cave', 'Jaskinia Łowców', '004.jpg', 11.5, 2.5, 3, 3, 1, 1, 5, [
            'goblin',
            'rat',
        ]),
        location('ithan-arena', 'Arena', 'arena', '001.jpg', 22, 11, 4, 4),
        location('ithan-tough', 'Mocny przeciwnik', 'toughenemy', '025.jpg', 6, 4.5, 4, 3, 2),
        location('ithan-inn', 'Karczma pod Rozbrykanym Niziołkiem', 'rest', '025.jpg', 11, 9.5, 3, 3),
        shopLocation('ithan-shop', 'Sklep', '001.jpg', 2.5, 12.5, 3, 3, 'blacksmith_1'),
        location('ithan-world', 'Mapa Świata', 'worldmap', '', 11.5, 14.5, 3, 3),
    ],
    enemies: {
        goblin: enemy('Gaunt', 'gaunt.gif', 15, 1, 3, 6, 0),
        rat: enemy('Szczur', 'szczur.gif', 8, 1, 2, 4, 0),
        wolf: enemy('Wilk', 'wolf.gif', 25, 3, 6, 11, 0),
        spider: enemy('Pająk', 'spider.gif', 30, 4, 7, 14, 0),
    },
    eliteEnemies: {
        astratus: enemy('Astratus', 'astratus.gif', 100, 10, 30, 50, 50),
        werecatTracker: enemy('Kotołak Tropiciel', 'kotolak.gif', 100, 10, 30, 50, 50),
    },
    elite2Enemies: {},
    heroEnemies: {
        harrietTheDomina: enemy('Domina Ecclesiae', 'domina-ecclesiae.gif', 150, 30, 70, 180, 100),
        billyTheDrunkard: enemy('Mietek Żul', 'zulek.gif', 30, 10, 30, 100, 5),
        wickedPatrick: enemy('Mroczny Patryk', 'mroczny-patryk3.gif', 300, 30, 100, 300, 666),
        spitefulGuide: enemy('Zły Przewodnik', 'mnich-zly-jacob.gif', 600, 50, 200, 400, 700),
    },
    arenaEnemies: {
        easy: ['goblin', 'rat'],
        medium: ['wolf', 'spider'],
        hard: ['spider', 'wolf'],
    },
});

const TORNEG: GameMapData = buildMap(2, {
    npcs: [
        npc('torneg-npc-1', 'Syntia', 'npc196.gif', 18, 5.5, 32, 48),
        npc('torneg-npc-2', 'Alan', 'npc240.gif', 12, 8.5, 32, 48),
        npc('torneg-npc-3', 'Milena', 'npc239.gif', 10, 9.5, 32, 48),
        npc('torneg-npc-4', 'Strażnik', 'npc256.gif', 13, 2.5, 32, 48),
        npc('torneg-npc-5', 'Salome', 'npc108.gif', 1, 5.5, 32, 48),
    ],
    locations: [
        battle(
            'torneg-mountain-cave',
            'Górska Grota',
            '005.jpg',
            8,
            1,
            4,
            2,
            9,
            11,
            15,
            ['dark_wolf', 'pelzacz'],
            2,
        ),
        battle(
            'torneg-spider-nest',
            'Gniazdo Pająków',
            '005.jpg',
            23.5,
            11.5,
            3,
            3,
            12,
            16,
            20,
            ['giant_spider', 'spider_queen'],
            2,
        ),
        location('torneg-arena', 'Arena', 'arena', '030.jpg', 15, 1.5, 4, 3, 3, { levelReq: 9 }),
        shopLocation('torneg-syntia', 'Sklep', '001.jpg', 19, 7, 4, 4, 'blacksmith_2'),
        location('torneg-inn', 'Karczma Umbara', 'rest', '025.jpg', 20.5, 14.5, 3, 3),
        location('torneg-tough', 'Mocny przeciwnik', 'toughenemy', '009.jpg', 1, 9, 2, 2, 2),
        location('torneg-world', 'Mapa Świata', 'worldmap', '', 14.5, 15, 5, 2),
    ],
    enemies: {
        dark_wolf: enemy('Mroczny Wilk', 'dark_wolf.gif', 55, 8, 14, 28, 4),
        pelzacz: enemy('Pełzacz', 'pelzacz.gif', 65, 9, 16, 32, 5),
        giant_spider: enemy('Olbrzymi Pająk', 'giant_spider.gif', 85, 13, 22, 48, 8),
        spider_queen: enemy('Królowa Pająków', 'spider_queen.gif', 110, 16, 27, 65, 12),
    },
    eliteEnemies: {
        astratus: enemy('Astratus', 'astratus.gif', 100, 10, 30, 50, 50),
        werecatTracker: enemy('Kotołak Tropiciel', 'kotolak.gif', 100, 10, 30, 50, 50),
    },
    elite2Enemies: {},
    heroEnemies: {
        harrietTheDomina: enemy('Domina Ecclesiae', 'domina-ecclesiae.gif', 150, 30, 70, 180, 100),
        billyTheDrunkard: enemy('Mietek Żul', 'zulek.gif', 30, 10, 30, 100, 5),
        wickedPatrick: enemy('Mroczny Patryk', 'mroczny-patryk3.gif', 300, 30, 100, 300, 666),
    },
    arenaEnemies: {
        easy: ['dark_wolf', 'pelzacz'],
        medium: ['giant_spider', 'dark_wolf'],
        hard: ['spider_queen', 'giant_spider'],
    },
});

const KARKA_HAN: GameMapData = buildMap(3, {
    npcs: [
        npc('karka-han-npc-1', 'Anzelm', 'npc266.gif', 3, 4.5, 32, 48),
        npc('karka-han-npc-2', 'Lady Gipsyanne', 'aryst01.gif', 13, 8.5, 32, 48),
        npc('karka-han-npc-3', 'Lady Clarissa', 'aryst02.gif', 14, 8.5, 32, 48),
    ],
    locations: [
        battle(
            'karka-virgin-forest',
            'Dziewicza Knieja',
            '009.jpg',
            8,
            3.5,
            4,
            3,
            20,
            21,
            25,
            ['zubr', 'grzechotnik'],
            2,
        ),
        battle(
            'karka-zulu-settlement',
            'Osada Zulusów',
            '007.jpg',
            1.5,
            9.5,
            3,
            3,
            24,
            26,
            30,
            ['giant_spider', 'spider_queen'],
            2,
        ),
        location('karka-arena', 'Arena', 'arena', '001.jpg', 16.5, 2.5, 5, 3, 3, { levelReq: 20 }),
        shopLocation('karka-armorer', 'Sklep', '001.jpg', 21, 10, 4, 4, 'blacksmith_2'),
        location('karka-inn', 'Karczma', 'rest', '025.jpg', 11, 9.5, 4, 3),
        location('karka-tough', 'Mocny przeciwnik', 'toughenemy', '035.jpg', 4, 5, 2, 2, 2),
        location('karka-world', 'Mapa Świata', 'worldmap', '', 11, 15, 4, 2),
    ],
    enemies: {
        zubr: enemy('Żubr', 'zubr.gif', 135, 21, 34, 92, 18),
        grzechotnik: enemy('Grzechotnik', 'grzechotnik.gif', 105, 24, 39, 96, 20),
        giant_spider: enemy('Olbrzymi Pająk', 'giant_spider.gif', 150, 28, 44, 118, 26),
    },
    eliteEnemies: {
        spider_queen: enemy('Królowa Pająków', 'spider_queen.gif', 185, 34, 52, 150, 35),
    },
    elite2Enemies: {},
    heroEnemies: {},
    arenaEnemies: {
        easy: ['zubr', 'grzechotnik'],
        medium: ['giant_spider', 'zubr'],
        hard: ['spider_queen', 'giant_spider'],
    },
});

const WERBIN: GameMapData = buildMap(4, {
    npcs: [
        npc('werbin-npc-1', 'Wiedźma Amra', 'npc85.gif', 1, 0.5, 32, 48),
        npc('werbin-npc-2', 'Irminka', 'dk-irmina.gif', 9, 8.5, 32, 48),
        npc('werbin-npc-3', 'Kotek', 'npc251.gif', 9, 5 - 1 / 16, 16, 38),
        npc('werbin-npc-4', 'Piesek', 'pies01d.gif', 13, 12 + 10 / 32, 26, 22),
        npc('werbin-npc-5', 'Ognisko', 'ogn_barb02.gif', 22, 6, 32, 32),
    ],
    locations: [
        battle(
            'werbin-heaths',
            'Wrzosowiska',
            '010.jpg',
            18.5,
            1,
            5,
            2,
            30,
            31,
            35,
            ['zubr', 'grzechotnik'],
            2,
        ),
        battle(
            'werbin-goblin-forest',
            'Las Goblinów',
            '009.jpg',
            23.5,
            10.5,
            3,
            3,
            35,
            36,
            40,
            ['giant_spider', 'spider_queen'],
            2,
        ),
        battle(
            'werbin-tristam',
            'Tristam',
            '008.jpg',
            1.5,
            1.5,
            3,
            3,
            35,
            36,
            40,
            ['giant_spider', 'spider_queen'],
            2,
        ),
        location('werbin-arena', 'Arena', 'arena', '001.jpg', 7.5, 2.5, 3, 3, 3, { levelReq: 35 }),
        shopLocation('werbin-armorer', 'Sklep', '001.jpg', 10.5, 9.5, 3, 3, 'blacksmith_3'),
        location('werbin-inn', 'Karczma', 'rest', '025.jpg', 17.5, 8.5, 3, 3),
        location('werbin-tough', 'Mocny przeciwnik', 'toughenemy', '011.jpg', 24, 5, 2, 2, 2),
        location('werbin-world', 'Mapa Świata', 'worldmap', '', 9.5, 15, 5, 2),
    ],
    enemies: {
        zubr: enemy('Żubr', 'zubr.gif', 220, 42, 66, 210, 48),
        grzechotnik: enemy('Grzechotnik', 'grzechotnik.gif', 180, 48, 75, 225, 52),
        giant_spider: enemy('Olbrzymi Pająk', 'giant_spider.gif', 260, 55, 88, 280, 70),
        spider_queen: enemy('Królowa Pająków', 'spider_queen.gif', 330, 68, 105, 360, 90),
    },
    eliteEnemies: {},
    elite2Enemies: {
        riverLord: enemy('Władca rzek', 'wladca-rzek.gif', 1500, 20, 50, 750, 400),
    },
    heroEnemies: {
        crimsonAvenger: enemy('Karmazynowy mściciel', 'gnom-msciciel2.gif', 2500, 20, 50, 1500, 650),
    },
    arenaEnemies: {
        easy: ['zubr', 'grzechotnik'],
        medium: ['giant_spider', 'zubr'],
        hard: ['spider_queen', 'giant_spider'],
    },
});

export const MAPS: Record<number, GameMapData> = {
    1: ITHAN,
    2: TORNEG,
    3: KARKA_HAN,
    4: WERBIN,
};

export const WORLD_MAP_POSITIONS: Array<{ id: number; x: number; y: number }> = [
    { id: 1, x: 58, y: 12 },
    { id: 2, x: 66, y: 22 },
    { id: 3, x: 48, y: 13 },
    { id: 4, x: 40, y: 15 },
    { id: 5, x: 53, y: 22 },
    { id: 6, x: 65, y: 33 },
    { id: 7, x: 37, y: 29 },
    { id: 8, x: 71, y: 49 },
    { id: 9, x: 23, y: 73 },
    { id: 10, x: 55, y: 35 },
];

export const POTION_EFFECT_RANGES: Record<string, Record<ItemRarityValue, [number, number]>> = {
    pa: {
        common: [5, 5],
        unique: [5, 10],
        heroic: [10, 20],
        legendary: [25, 25],
    },
};

export const SHOPS: Record<string, Shop> = {
    blacksmith_1: {
        id: 'blacksmith_1',
        name: 'Sklep',
        items: [
            shopItem(201, 'Miecz żelazny', 'items/sword.gif', 'weapon', 'common', 1, { dmgMin: 3, dmgMax: 7 }, 150),
            shopItem(202, 'Topór wojenny', 'items/axe.gif', 'weapon', 'common', 3, { dmgMin: 5, dmgMax: 10 }, 300),
            shopItem(
                203,
                'Wzmocniony Sztylet',
                'items/dagger.gif',
                'weapon',
                'unique',
                5,
                { dmgMin: 4, dmgMax: 8, critChance: 3 },
                450,
            ),
            shopItem(211, 'Skórzana zbroja', 'items/leather.gif', 'armor', 'common', 1, { armor: 5 }, 100),
            shopItem(212, 'Kolczuga', 'items/chainmail.gif', 'armor', 'common', 4, { armor: 12 }, 250),
            shopItem(
                213,
                'Błogosławiona Peleryna',
                'items/cloak.gif',
                'armor',
                'unique',
                5,
                { armor: 8, dodge: 2 },
                400,
            ),
            shopItem(221, 'Pierścień Wojownika', 'items/ring.gif', 'talisman', 'common', 2, { hp: 10 }, 120),
            shopItem(
                222,
                'Mistyczny Amulet',
                'items/amulet.gif',
                'talisman',
                'unique',
                6,
                { critChance: 2, hp: 15 },
                500,
            ),
        ],
    },
    blacksmith_2: {
        id: 'blacksmith_2',
        name: 'Sklep',
        items: [
            shopItem(401, 'Mroczny Miecz', 'items/sword.gif', 'weapon', 'common', 10, { dmgMin: 12, dmgMax: 20 }, 800),
            shopItem(402, 'Topór Cienia', 'items/axe.gif', 'weapon', 'common', 12, { dmgMin: 15, dmgMax: 25 }, 1200),
            shopItem(
                403,
                'Bohaterski Młot',
                'items/hammer.gif',
                'weapon',
                'heroic',
                15,
                { dmgMin: 18, dmgMax: 30, critChance: 5, critPower: 15 },
                2500,
            ),
            shopItem(
                404,
                'Legendarny Miecz Zagłady',
                'items/sword.gif',
                'weapon',
                'legendary',
                18,
                { dmgMin: 25, dmgMax: 40, critChance: 8, critPower: 25, doubleDamage: 5 },
                8000,
            ),
            shopItem(411, 'Zbroja Cieni', 'items/plate.gif', 'armor', 'common', 10, { armor: 25 }, 900),
            shopItem(
                412,
                'Epicki Pancerz Strażnika',
                'items/plate.gif',
                'armor',
                'heroic',
                15,
                { armor: 35, hp: 30, dodge: 3 },
                3000,
            ),
            shopItem(
                413,
                'Nieśmiertelna Zbroja',
                'items/plate.gif',
                'armor',
                'legendary',
                18,
                { armor: 50, hp: 50, dodge: 5, doubleArmor: 5 },
                10000,
            ),
            shopItem(
                421,
                'Potężny Pierścień',
                'items/ring.gif',
                'talisman',
                'heroic',
                14,
                { critChance: 4, critPower: 12 },
                1500,
            ),
            shopItem(
                422,
                'Mityczny Amulet Mocy',
                'items/amulet.gif',
                'talisman',
                'legendary',
                18,
                { hp: 40, critChance: 6, stun: 3 },
                5000,
            ),
        ],
    },
    blacksmith_3: {
        id: 'blacksmith_3',
        name: 'Sklep',
        items: [
            shopItem(
                601,
                'Smocza Kosa',
                'items/spear.gif',
                'weapon',
                'heroic',
                20,
                { dmgMin: 30, dmgMax: 50, critChance: 7, critPower: 20 },
                5000,
            ),
            shopItem(
                602,
                'Boski Miecz Zagłady',
                'items/sword.gif',
                'weapon',
                'legendary',
                25,
                { dmgMin: 45, dmgMax: 70, critChance: 12, critPower: 35, doubleDamage: 8 },
                15000,
            ),
            shopItem(
                611,
                'Smocza Łuska',
                'items/plate.gif',
                'armor',
                'legendary',
                22,
                { armor: 70, hp: 80, dodge: 7, doubleArmor: 8 },
                18000,
            ),

            // Endgame chase items. Deliberately far above the rest of the
            // catalogue in both power and price, so they stay a long-term gold
            // sink rather than a routine upgrade. Crit chance stays modest
            // because `recalculate` caps it at 50%; the budget goes into
            // damage, armour and HP, which are uncapped.
            shopItem(
                701,
                'Kosa Zapomnianego Króla',
                'items/spear.gif',
                'weapon',
                'legendary',
                30,
                { dmgMin: 90, dmgMax: 140, critChance: 10, critPower: 50, doubleDamage: 10 },
                55000,
            ),
            shopItem(
                702,
                'Ostrze Końca Świata',
                'items/sword.gif',
                'weapon',
                'legendary',
                35,
                { dmgMin: 140, dmgMax: 210, critChance: 12, critPower: 70, doubleDamage: 15 },
                120000,
            ),
            shopItem(
                711,
                'Pancerz Wiecznego Świtu',
                'items/plate.gif',
                'armor',
                'legendary',
                33,
                { armor: 120, hp: 200, dodge: 10, doubleArmor: 10 },
                90000,
            ),
            shopItem(
                721,
                'Serce Praojców',
                'items/amulet.gif',
                'talisman',
                'legendary',
                38,
                { hp: 300, critChance: 10, critPower: 60, stun: 8 },
                250000,
            ),
        ],
    },
};

/**
 * Stock that follows the player's level.
 *
 * The fixed entries above are hand-tuned for a level bracket and go stale once
 * you outgrow them. These templates instead restat and reprice themselves off
 * the current level, so every shop always carries usable baseline gear. Stats
 * grow slower than price, so the fixed items stay the more interesting buy.
 */
export type ScaledShopTemplate = {
    id: number;
    name: string;
    image: string;
    type: ItemTypeValue;
    rarity: ItemRarityValue;
    /** Stats at level 1. */
    base: ItemStats;
    /** Price at level 1. */
    basePrice: number;
};

const SCALED_STAT_GROWTH = 0.12;
const SCALED_PRICE_GROWTH = 0.25;

export const SCALED_SHOP_TEMPLATES: ScaledShopTemplate[] = [
    {
        id: 901,
        name: 'Miecz Najemnika',
        image: 'items/sword.gif',
        type: 'weapon',
        rarity: 'common',
        base: { dmgMin: 4, dmgMax: 8 },
        basePrice: 200,
    },
    {
        id: 902,
        name: 'Zaklęta Głownia',
        image: 'items/dagger.gif',
        type: 'weapon',
        rarity: 'unique',
        base: { dmgMin: 6, dmgMax: 11, critChance: 3 },
        basePrice: 450,
    },
    {
        id: 911,
        name: 'Kuta Zbroja',
        image: 'items/chainmail.gif',
        type: 'armor',
        rarity: 'common',
        base: { armor: 8 },
        basePrice: 220,
    },
    {
        id: 912,
        name: 'Zbroja Wędrowca',
        image: 'items/plate.gif',
        type: 'armor',
        rarity: 'unique',
        base: { armor: 12, hp: 15, dodge: 2 },
        basePrice: 500,
    },
    {
        id: 921,
        name: 'Amulet Wędrowca',
        image: 'items/amulet.gif',
        type: 'talisman',
        rarity: 'unique',
        base: { hp: 20, critChance: 2, critPower: 10 },
        basePrice: 550,
    },
];

function scaledShopItem(template: ScaledShopTemplate, playerLevel: number): Item {
    const level = Math.max(1, playerLevel);
    const statScale = 1 + (level - 1) * SCALED_STAT_GROWTH;
    const priceScale = 1 + (level - 1) * SCALED_PRICE_GROWTH;

    const stats: ItemStats = {};
    for (const [key, value] of Object.entries(template.base)) {
        stats[key as keyof ItemStats] = Math.max(1, Math.floor((value ?? 0) * statScale));
    }

    const item = shopItem(
        template.id,
        template.name,
        template.image,
        template.type,
        template.rarity,
        // Requirement tracks the player, so this gear is always equippable.
        level,
        stats,
        Math.floor(template.basePrice * priceScale),
    );

    // Namespaced so a scaled entry can never collide with a fixed one.
    return { ...item, id: `scaled_${template.id}` };
}

export function scaledShopItems(playerLevel: number): Item[] {
    return SCALED_SHOP_TEMPLATES.map((template) => scaledShopItem(template, playerLevel));
}

/** Every shop with its level-scaled stock appended to the fixed catalogue. */
export function shopsFor(playerLevel: number): Record<string, Shop> {
    const scaled = scaledShopItems(playerLevel);
    const shops: Record<string, Shop> = {};

    for (const [shopId, shop] of Object.entries(SHOPS)) {
        shops[shopId] = { ...shop, items: [...shop.items, ...scaled] };
    }

    return shops;
}

/**
 * Resolves a shop the same way the snapshot does.
 *
 * Buying must go through this rather than `getShop`, otherwise level-scaled
 * items would be visible in the UI but rejected as unknown at purchase time.
 */
export function getShopFor(playerLevel: number, shopId: string): Shop | null {
    return shopsFor(playerLevel)[shopId] ?? null;
}

export type ItemBase = {
    name: string;
    image: string;
    dmgMin?: number;
    dmgMax?: number;
    armor?: number;
    effect?: { type: string; value: number };
};

export const ITEM_BASES: Record<ItemTypeValue, ItemBase[]> = {
    weapon: [
        { name: 'Miecz', image: 'items/sword.gif', dmgMin: 2, dmgMax: 5 },
        { name: 'Topór', image: 'items/axe.gif', dmgMin: 3, dmgMax: 7 },
        { name: 'Sztylet', image: 'items/dagger.gif', dmgMin: 1, dmgMax: 4 },
        { name: 'Młot', image: 'items/hammer.gif', dmgMin: 4, dmgMax: 8 },
        { name: 'Włócznia', image: 'items/spear.gif', dmgMin: 2, dmgMax: 6 },
    ],
    armor: [
        { name: 'Skórzana zbroja', image: 'items/leather.gif', armor: 3 },
        { name: 'Kolczuga', image: 'items/chainmail.gif', armor: 6 },
        { name: 'Zbroja płytowa', image: 'items/plate.gif', armor: 10 },
        { name: 'Szata', image: 'items/robe.gif', armor: 4 },
        { name: 'Peleryna', image: 'items/cloak.gif', armor: 2 },
    ],
    talisman: [
        { name: 'Pierścień', image: 'items/ring.gif' },
        { name: 'Amulet', image: 'items/amulet.gif' },
        { name: 'Talizman', image: 'items/charm.gif' },
        { name: 'Medal', image: 'items/medal.gif' },
        { name: 'Runa', image: 'items/rune.gif' },
    ],
    potion: [{ name: 'Butelka PA', image: 'items/pa.gif', effect: { type: 'pa', value: 5 } }],
};

export const RARITY_PREFIXES: Partial<Record<ItemRarityValue, string[]>> = {
    unique: ['Mocny', 'Wzmocniony', 'Zaklęty', 'Mistyczny'],
    heroic: ['Bohaterski', 'Epicki', 'Potężny', 'Starożytny'],
    legendary: ['Legendarny', 'Mityczny', 'Boski', 'Nieśmiertelny'],
};

export const BASE_DROP_CHANCES: Record<ItemRarityValue, number> = {
    common: 60,
    unique: 25,
    heroic: 12,
    legendary: 3,
};

export function getMap(mapId: number): GameMapData {
    const map = MAPS[mapId];

    if (!map) {
        throw new GameError(`Nieznana mapa [${mapId}].`);
    }

    return map;
}

export function getShop(shopId: string): Shop | null {
    return SHOPS[shopId] ?? null;
}

export function getLocation(mapId: number, locationId: string): GameLocation | null {
    return getMap(mapId).locations.find((candidate) => candidate.id === locationId) ?? null;
}

export function scaledEnemy(
    mapId: number,
    enemyKey: string,
    level: number,
    group: EnemyGroup,
): ScaledEnemy {
    const base = getMap(mapId)[group][enemyKey];

    if (!base) {
        throw new GameError(`Nieznany przeciwnik [${enemyKey}].`);
    }

    const multiplier = 1 + (level - 1) * 0.15;

    return {
        ...base,
        key: enemyKey,
        level,
        hp: Math.floor(base.baseHp * multiplier),
        dmgMin: Math.floor(base.dmgMin * multiplier),
        dmgMax: Math.floor(base.dmgMax * multiplier),
        exp: Math.floor(base.exp * multiplier),
        gold: Math.floor(base.gold * multiplier),
    };
}

export function stagesForLocation(location: GameLocation, unlockedStage: number): Stage[] {
    const levelMin = location.levelMin ?? 1;
    const levelMax = location.levelMax ?? 5;
    const stages: Stage[] = [];

    for (let stage = 1; stage <= STAGES_PER_LOCATION; stage++) {
        stages.push({
            stage,
            level: Math.floor(levelMin + ((levelMax - levelMin) * (stage - 1)) / (STAGES_PER_LOCATION - 1)),
            unlocked: stage <= unlockedStage,
            completed: stage < unlockedStage,
        });
    }

    return stages;
}

export function arenaPaCost(difficulty: ArenaDifficultyValue): number {
    return ARENA_DIFFICULTY_META[difficulty].paCost;
}
