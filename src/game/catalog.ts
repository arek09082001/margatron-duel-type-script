/**
 * Port of `app/Game/Repositories/StaticGameCatalogRepository.php`.
 *
 * All content is static, so the maps/shops are built once at module load
 * instead of being rebuilt on every call like the PHP version did.
 */

import { assetUrl } from './assets';
import { MAX_BAG_SLOTS, STAGES_PER_LOCATION } from './config';
import { ARENA_DIFFICULTY_META, ITEM_TYPE_LABELS, MAP_META, RARITY_META } from './enums';
import { GameError } from './errors';
import { bagBasesFor, createBagItem, createGearItem, gearTierFor } from './gear';
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

const OLSZAWA: GameMapData = buildMap(1, {
    npcs: [
        npc('olszawa-elder', 'Stary Borzywój', 'olszawa-elder.png', 8.8125, 7.0938, 32, 48),
        npc('olszawa-herbalist', 'Kalina Zielarka', 'olszawa-herbalist.png', 5.9062, 8, 32, 48),
        npc('olszawa-woodcutter', 'Miłosz Drwal', 'olszawa-woodcutter.png', 14.1875, 4.8125, 32, 48),
        npc('olszawa-campfire', 'Ognisko', 'olszawa-campfire.png', 16.6875, 3.5938, 32, 32),
        npc('olszawa-dog', 'Burek', 'olszawa-dog.png', 10, 12.625, 26, 22),
    ],
    locations: [
        battle(
            'olszawa-badger-cave',
            'Jaskinia Borsuka',
            '004.jpg',
            12.5,
            2.5,
            3,
            3,
            1,
            1,
            5,
            ['goblin', 'rat'],
            1,
        ),
        battle(
            'olszawa-damp-ravine',
            'Wilgotny Jar',
            '009.jpg',
            22,
            3.5,
            4,
            3,
            3,
            6,
            10,
            ['wolf', 'spider'],
            1,
        ),
        location('olszawa-arena', 'Arena', 'arena', '001.jpg', 22, 12, 4, 4, 1),
        location('olszawa-tough', 'Mocny przeciwnik', 'toughenemy', '025.jpg', 3.5, 5.5, 3, 3, 2),
        location('olszawa-inn', 'Zajazd pod Krzywą Osiką', 'rest', '025.jpg', 12, 10.5, 4, 3, 1),
        shopLocation('olszawa-shop', 'Kuźnia', '001.jpg', 4, 11.5, 4, 3, 'blacksmith_1'),
        location('olszawa-world', 'Mapa Świata', 'worldmap', '', 12.5, 15, 3, 2, 1),
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

const RUDZIN: GameMapData = buildMap(2, {
    npcs: [
        npc('rudzin-merchant', 'Radomiła Kupcowa', 'rudzin-merchant.png', 9.9062, 10.9062, 32, 48),
        npc('rudzin-guard', 'Strażnik Ziemowit', 'rudzin-guard.png', 12.0938, 4.0938, 32, 48),
        npc('rudzin-baker', 'Piekarka Jaga', 'rudzin-baker.png', 17.5, 11, 32, 48),
        npc('rudzin-cat', 'Mruczek', 'rudzin-cat.png', 5.6875, 5.8438, 20, 18),
    ],
    locations: [
        battle('rudzin-quarry', 'Kamieniołom', '005.jpg', 3, 2.5, 4, 3, 9, 11, 15, ['dark_wolf', 'pelzacz'], 2),
        battle(
            'rudzin-catacombs',
            'Zapadłe Katakumby',
            '005.jpg',
            22,
            13.5,
            4,
            3,
            12,
            16,
            20,
            ['giant_spider', 'spider_queen'],
            2,
        ),
        location('rudzin-arena', 'Arena', 'arena', '030.jpg', 22, 2.5, 4, 3, 3, { levelReq: 9 }),
        location('rudzin-tough', 'Mocny przeciwnik', 'toughenemy', '009.jpg', 2.5, 13.5, 3, 3, 2),
        location('rudzin-inn', 'Karczma pod Miedzianym Dzbanem', 'rest', '025.jpg', 17, 9.5, 4, 3, 1),
        shopLocation('rudzin-shop', 'Kuźnia', '001.jpg', 8, 9.5, 4, 3, 'blacksmith_2'),
        location('rudzin-world', 'Mapa Świata', 'worldmap', '', 12.5, 15, 3, 2, 1),
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

const WIELGRAD: GameMapData = buildMap(3, {
    npcs: [
        npc('wielgrad-castellan', 'Kasztelan Dobrogost', 'wielgrad-castellan.png', 12.4062, 10.9062, 32, 48),
        npc('wielgrad-fisher', 'Rybak Świerad', 'wielgrad-fisher.png', 5.9062, 13.0938, 32, 48),
        npc('wielgrad-lady', 'Lady Ludmiła', 'wielgrad-lady.png', 15.6875, 6.5, 32, 48),
        npc('wielgrad-lampman', 'Latarnik Rościsław', 'wielgrad-lampman.png', 18.9062, 13.0938, 32, 48),
    ],
    locations: [
        battle(
            'wielgrad-flooded-docks',
            'Zalane Doki',
            '009.jpg',
            3,
            2.5,
            4,
            3,
            20,
            21,
            25,
            ['zubr', 'grzechotnik'],
            2,
        ),
        battle(
            'wielgrad-canals',
            'Kanały Wielgradu',
            '007.jpg',
            22,
            2.5,
            4,
            3,
            24,
            26,
            30,
            ['giant_spider', 'spider_queen'],
            2,
        ),
        location('wielgrad-arena', 'Arena', 'arena', '001.jpg', 21.5, 11, 5, 4, 3, { levelReq: 20 }),
        location('wielgrad-tough', 'Mocny przeciwnik', 'toughenemy', '035.jpg', 2.5, 10.5, 3, 3, 2),
        location('wielgrad-inn', 'Gospoda Rzeczna', 'rest', '025.jpg', 8, 12.5, 4, 3, 1),
        shopLocation('wielgrad-shop', 'Zbrojownia', '001.jpg', 17, 12.5, 4, 3, 'blacksmith_2'),
        location('wielgrad-world', 'Mapa Świata', 'worldmap', '', 12.5, 2, 3, 2, 1),
    ],
    enemies: {
        zubr: enemy('Żubr', 'zubr.gif', 135, 21, 34, 92, 18),
        grzechotnik: enemy('Grzechotnik', 'grzechotnik.gif', 105, 24, 39, 96, 20),
        giant_spider: enemy('Olbrzymi Pająk', 'giant_spider.gif', 150, 28, 44, 118, 26),
        // Osada Zulusów and the hard arena both roll `spider_queen`, but it was
        // only ever defined under `eliteEnemies` — so those fights threw
        // "Nieznany przeciwnik [spider_queen]". Rudzin and Czarnobór both list it
        // as a normal enemy; Wielgrad was the outlier.
        spider_queen: enemy('Królowa Pająków', 'spider_queen.gif', 185, 34, 52, 150, 35),
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

const CZARNOBOR: GameMapData = buildMap(4, {
    npcs: [
        npc('czarnobor-trapper', 'Traper Wilkosz', 'czarnobor-trapper.png', 10.5, 7.0938, 32, 48),
        npc('czarnobor-healer', 'Znachorka Wierzba', 'czarnobor-healer.png', 13.5, 7.0938, 32, 48),
        npc('czarnobor-hunter', 'Łowczy Godzimir', 'czarnobor-hunter.png', 19.5, 9.0938, 32, 48),
        npc('czarnobor-campfire', 'Ognisko', 'czarnobor-campfire.png', 12, 10.8125, 32, 32),
        npc('czarnobor-dog', 'Sfora', 'czarnobor-dog.png', 15.1875, 10.7188, 26, 22),
    ],
    locations: [
        battle(
            'czarnobor-tar-forest',
            'Smolna Puszcza',
            '010.jpg',
            3,
            2.5,
            4,
            3,
            30,
            31,
            35,
            ['zubr', 'grzechotnik'],
            2,
        ),
        battle(
            'czarnobor-barrows',
            'Kurhany Czarnoboru',
            '009.jpg',
            22,
            2.5,
            4,
            3,
            35,
            36,
            40,
            ['giant_spider', 'spider_queen'],
            2,
        ),
        battle(
            'czarnobor-wolf-grove',
            'Wilcze Uroczysko',
            '008.jpg',
            22,
            13.5,
            4,
            3,
            35,
            36,
            40,
            ['giant_spider', 'spider_queen'],
            2,
        ),
        location('czarnobor-arena', 'Arena', 'arena', '001.jpg', 11.5, 2.5, 5, 3, 3, { levelReq: 35 }),
        location('czarnobor-tough', 'Mocny przeciwnik', 'toughenemy', '011.jpg', 2.5, 13.5, 3, 3, 2),
        location('czarnobor-inn', 'Karczma Traperów', 'rest', '025.jpg', 17, 6.5, 4, 3, 1),
        shopLocation('czarnobor-shop', 'Skład Traperski', '001.jpg', 8, 6.5, 4, 3, 'blacksmith_3'),
        location('czarnobor-world', 'Mapa Świata', 'worldmap', '', 12.5, 14, 3, 2, 1),
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

/**
 * Late-game lands.
 *
 * Enemy numbers are derived rather than guessed. `scaledEnemy` multiplies every
 * base value by `1 + (level - 1) * 0.15`, so a land ten levels on already hits
 * ~20% harder at identical base stats — which is why these grow more gently
 * than the ×2-per-land step between Olszawa and Czarnobór. The targets, measured
 * against a player wearing that land's shop gear at its last level:
 *
 * - the toughest enemy dies in roughly six rounds,
 * - it needs roughly six hits to kill the player.
 *
 * That is the curve Wielgrad draws, the healthiest of the first four lands.
 * The weaker three enemies of each land sit at 55% / 67% / 79% of the toughest,
 * mirroring how Czarnobór spaces its four.
 *
 * Experience is tuned to ~12 kills per level: `expForNextLevel` grows with the
 * square of the level while the enemy multiplier grows linearly, so base
 * experience has to rise only gently to keep levelling at a steady pace.
 */
const SOLWAR: GameMapData = buildMap(5, {
    npcs: [
        npc('solwar-lightkeeper', 'Latarnik Wawrzyn', 'solwar-lightkeeper.png', 15.0938, 5.9062, 32, 48),
        npc('solwar-salter', 'Warzelnik Solimir', 'solwar-salter.png', 8.9062, 5.9062, 32, 48),
        npc('solwar-sailor', 'Żeglarka Nawoja', 'solwar-sailor.png', 12, 11.3125, 32, 48),
        npc('solwar-cat', 'Mgiełka', 'solwar-cat.png', 17.2812, 12.8438, 20, 18),
    ],
    locations: [
        battle(
            'solwar-salt-pans',
            'Warzelnie Soli',
            '012.jpg',
            3,
            2.5,
            4,
            3,
            40,
            41,
            45,
            ['thief', 'madHunter'],
            3,
        ),
        battle(
            'solwar-castaway-bay',
            'Zatoka Rozbitków',
            '019.jpg',
            22,
            2.5,
            4,
            3,
            45,
            46,
            50,
            ['blackKnight', 'witch'],
            3,
        ),
        location('solwar-arena', 'Arena', 'arena', '030.jpg', 21.5, 11, 5, 4, 3, { levelReq: 40 }),
        location('solwar-tough', 'Mocny przeciwnik', 'toughenemy', '013.jpg', 2.5, 10.5, 3, 3, 3),
        location('solwar-inn', 'Gospoda pod Latarnią', 'rest', '025.jpg', 19, 5.5, 4, 3, 1),
        shopLocation('solwar-shop', 'Skład Portowy', '001.jpg', 6, 5.5, 4, 3, 'blacksmith_4'),
        location('solwar-world', 'Mapa Świata', 'worldmap', '', 12.5, 2, 3, 2, 1),
    ],
    enemies: {
        thief: enemy('Złodziej', 'zlodziej.gif', 235, 33, 51, 217, 104),
        madHunter: enemy('Obłąkany Łowca', 'oblakanylowca2.gif', 287, 41, 62, 232, 112),
        blackKnight: enemy('Czarny Rycerz', 'mob125.gif', 338, 48, 73, 292, 140),
        witch: enemy('Wiedźma z Sołwaru', 'mob127.gif', 428, 61, 92, 374, 180),
    },
    eliteEnemies: {
        evilMage: enemy('Zły Mag', 'zlamag0.gif', 855, 33, 51, 898, 720),
    },
    elite2Enemies: {
        darkMonk: enemy('Mroczny Mnich', 'mnich-zly.gif', 813, 41, 63, 1496, 1206),
    },
    heroEnemies: {
        cerberus: enemy('Cerber', 'cerber.gif', 877, 41, 63, 2207, 1980),
    },
    arenaEnemies: {
        easy: ['thief', 'madHunter'],
        medium: ['blackKnight', 'madHunter'],
        hard: ['witch', 'blackKnight'],
    },
});

const NIHRAST: GameMapData = buildMap(6, {
    npcs: [
        npc('nihrast-priest', 'Kapłan Ogniec', 'nihrast-priest.png', 12, 10.6875, 32, 48),
        npc('nihrast-sister', 'Siostra Iskra', 'nihrast-sister.png', 9.0938, 7.0938, 32, 48),
        npc('nihrast-smith', 'Kowal Żarowit', 'nihrast-smith.png', 5.9062, 7.0938, 32, 48),
        npc('nihrast-watch', 'Straż Nihrastu', 'nihrast-watch.png', 15.9062, 7.0938, 32, 48),
    ],
    locations: [
        battle(
            'nihrast-basalt-stairs',
            'Bazaltowe Schody',
            '005.jpg',
            3,
            2.5,
            4,
            3,
            50,
            51,
            55,
            ['abyssSpawn', 'darkMonk'],
            3,
        ),
        battle(
            'nihrast-ash-crypt',
            'Krypta Popiołów',
            '021.jpg',
            22,
            2.5,
            4,
            3,
            55,
            56,
            60,
            ['inquisitor', 'evilMage'],
            3,
        ),
        location('nihrast-arena', 'Arena', 'arena', '001.jpg', 21.5, 13, 5, 4, 3, { levelReq: 50 }),
        location('nihrast-tough', 'Mocny przeciwnik', 'toughenemy', '022.jpg', 2.5, 12.5, 3, 3, 3),
        location('nihrast-inn', 'Karczma Popielna', 'rest', '025.jpg', 19, 6.5, 4, 3, 1),
        shopLocation('nihrast-shop', 'Kuźnia Żarowa', '001.jpg', 6, 6.5, 4, 3, 'blacksmith_4'),
        location('nihrast-temple', 'Mapa Świata', 'worldmap', '', 12.5, 2, 3, 2, 1),
    ],
    enemies: {
        abyssSpawn: enemy('Pomiot Otchłani', 'mob124.gif', 355, 48, 73, 265, 209),
        darkMonk: enemy('Mroczny Mnich', 'mnich-zly.gif', 433, 59, 89, 283, 223),
        inquisitor: enemy('Karmazynowy Inkwizytor', 'mob126.gif', 510, 69, 105, 356, 281),
        evilMage: enemy('Zły Mag', 'zlamag0.gif', 646, 88, 133, 457, 360),
    },
    eliteEnemies: {
        wraith: enemy('Zjawa', 'mob128.gif', 1292, 48, 73, 1097, 1440),
    },
    elite2Enemies: {
        minotaur: enemy('Minotaur', 'mob130.gif', 1227, 60, 90, 1828, 2412),
    },
    heroEnemies: {
        apostate: enemy('Apostata Paladynów', 'paladynski-apostata.gif', 1324, 60, 90, 2696, 3960),
    },
    arenaEnemies: {
        easy: ['abyssSpawn', 'darkMonk'],
        medium: ['inquisitor', 'darkMonk'],
        hard: ['evilMage', 'inquisitor'],
    },
});

const ZHURMAT: GameMapData = buildMap(7, {
    npcs: [
        npc('zhurmat-caravaneer', 'Karawaniarz Zahed', 'zhurmat-caravaneer.png', 12, 9.0938, 32, 48),
        npc('zhurmat-weaver', 'Tkaczka Amira', 'zhurmat-weaver.png', 6.9062, 10.9062, 32, 48),
        npc('zhurmat-waterman', 'Studniarz Hazir', 'zhurmat-waterman.png', 17.9062, 7.9062, 32, 48),
        npc('zhurmat-guard', 'Straż Oazy', 'zhurmat-guard.png', 12, 2.9062, 32, 48),
    ],
    locations: [
        battle(
            'zhurmat-dunes',
            'Wydmy Zhurmatu',
            '008.jpg',
            3,
            2.5,
            4,
            3,
            60,
            61,
            65,
            ['wraith', 'minotaur'],
            3,
        ),
        battle(
            'zhurmat-necropolis',
            'Zapomniana Nekropolia',
            '018.jpg',
            22,
            2.5,
            4,
            3,
            65,
            66,
            70,
            ['cerberus', 'apostate'],
            3,
        ),
        location('zhurmat-arena', 'Arena', 'arena', '030.jpg', 21.5, 13, 5, 4, 3, { levelReq: 60 }),
        location('zhurmat-tough', 'Mocny przeciwnik', 'toughenemy', '011.jpg', 2.5, 12.5, 3, 3, 3),
        location('zhurmat-inn', 'Karczma Karawan', 'rest', '025.jpg', 19, 5.5, 4, 3, 1),
        shopLocation('zhurmat-shop', 'Bazar Zhurmatu', '001.jpg', 6, 5.5, 4, 3, 'blacksmith_5'),
        location('zhurmat-world', 'Mapa Świata', 'worldmap', '', 12.5, 2, 3, 2, 1),
    ],
    enemies: {
        wraith: enemy('Zjawa', 'mob128.gif', 536, 69, 105, 313, 418),
        minotaur: enemy('Minotaur', 'mob130.gif', 653, 85, 128, 335, 446),
        cerberus: enemy('Cerber', 'cerber.gif', 770, 100, 151, 421, 562),
        apostate: enemy('Apostata Paladynów', 'paladynski-apostata.gif', 975, 126, 192, 540, 720),
    },
    eliteEnemies: {
        possessedPaladin: enemy('Opętany Paladyn', 'opetanypaladyn.gif', 1950, 69, 105, 1296, 2880),
    },
    elite2Enemies: {
        boneLord: enemy('Władca Kości', 'bonelord.gif', 1853, 86, 130, 2160, 4824),
    },
    heroEnemies: {
        blackDemon: enemy('Czarny Demon', 'demon_cz_s.gif', 1999, 86, 130, 3186, 7920),
    },
    arenaEnemies: {
        easy: ['wraith', 'minotaur'],
        medium: ['cerberus', 'minotaur'],
        hard: ['apostate', 'cerberus'],
    },
});

const GRZMIEL: GameMapData = buildMap(8, {
    npcs: [
        npc('grzmiel-castellan', 'Kasztelan Grom', 'grzmiel-castellan.png', 12, 10.6875, 32, 48),
        npc('grzmiel-armourer', 'Płatnerz Wojmir', 'grzmiel-armourer.png', 5.9062, 6.6875, 32, 48),
        npc('grzmiel-scout', 'Zwiadowca Turoń', 'grzmiel-scout.png', 18.0938, 6.6875, 32, 48),
        npc('grzmiel-watch', 'Straż Przełęczy', 'grzmiel-watch.png', 12, 2.9062, 32, 48),
    ],
    locations: [
        battle(
            'grzmiel-thunder-ridge',
            'Grań Piorunów',
            '010.jpg',
            3,
            2.5,
            4,
            3,
            70,
            71,
            75,
            ['possessedPaladin', 'boneLord'],
            3,
        ),
        battle(
            'grzmiel-mine-shafts',
            'Sztolnie Grzmiela',
            '023.jpg',
            22,
            2.5,
            4,
            3,
            75,
            76,
            80,
            ['blackDemon', 'avenger'],
            3,
        ),
        location('grzmiel-arena', 'Arena', 'arena', '001.jpg', 21.5, 13, 5, 4, 3, { levelReq: 70 }),
        location('grzmiel-tough', 'Mocny przeciwnik', 'toughenemy', '035.jpg', 2.5, 12.5, 3, 3, 3),
        location('grzmiel-inn', 'Gospoda pod Kuszą', 'rest', '025.jpg', 19, 5.5, 4, 3, 1),
        shopLocation('grzmiel-shop', 'Płatnerz', '001.jpg', 6, 5.5, 4, 3, 'blacksmith_5'),
        location('grzmiel-world', 'Mapa Świata', 'worldmap', '', 12.5, 2, 3, 2, 1),
    ],
    enemies: {
        possessedPaladin: enemy('Opętany Paladyn', 'opetanypaladyn.gif', 810, 100, 152, 361, 835),
        boneLord: enemy('Władca Kości', 'bonelord.gif', 987, 122, 185, 386, 893),
        blackDemon: enemy('Czarny Demon', 'demon_cz_s.gif', 1163, 144, 218, 486, 1123),
        avenger: enemy('Gnom Mściciel', 'gnom_msciciel.gif', 1472, 182, 276, 623, 1440),
    },
    eliteEnemies: {
        founder: enemy('Założyciel', 'zalozyciel.gif', 2945, 100, 152, 1495, 5760),
    },
    elite2Enemies: {
        blackDemon: enemy('Czarny Demon', 'demon_cz_s.gif', 2798, 124, 188, 2492, 9648),
    },
    heroEnemies: {
        veryEvilPatrick: enemy('Bardzo Zły Patryk', 'bardzozlypatryk.gif', 3019, 124, 188, 3676, 15840),
    },
    arenaEnemies: {
        easy: ['possessedPaladin', 'boneLord'],
        medium: ['blackDemon', 'boneLord'],
        hard: ['avenger', 'blackDemon'],
    },
});

const ISMERIA: GameMapData = buildMap(9, {
    npcs: [
        npc('ismeria-exile', 'Zimosław Wygnaniec', 'ismeria-exile.png', 12, 10.6875, 32, 48),
        npc('ismeria-shaman', 'Szamanka Wiłna', 'ismeria-shaman.png', 8.9062, 6.6875, 32, 48),
        npc('ismeria-smith', 'Kowal Ostroga', 'ismeria-smith.png', 6.0938, 6.6875, 32, 48),
        npc('ismeria-cat', 'Śnieżek', 'ismeria-cat.png', 16.2812, 7.8438, 20, 18),
    ],
    locations: [
        battle(
            'ismeria-ice-rifts',
            'Lodowe Rozpadliny',
            '014.jpg',
            3,
            2.5,
            4,
            3,
            80,
            81,
            85,
            ['blackDemon', 'boneLord'],
            3,
        ),
        battle(
            'ismeria-frozen-haven',
            'Zamarzła Przystań',
            '027.jpg',
            22,
            2.5,
            4,
            3,
            85,
            86,
            90,
            ['founder', 'cerberus'],
            3,
        ),
        location('ismeria-arena', 'Arena', 'arena', '030.jpg', 21.5, 12, 5, 4, 3, { levelReq: 80 }),
        location('ismeria-tough', 'Mocny przeciwnik', 'toughenemy', '028.jpg', 2.5, 11.5, 3, 3, 3),
        location('ismeria-inn', 'Karczma pod Szronem', 'rest', '025.jpg', 19, 5.5, 4, 3, 1),
        shopLocation('ismeria-shop', 'Zbrojownia Wygnańców', '001.jpg', 6, 5.5, 4, 3, 'blacksmith_6'),
        location('ismeria-world', 'Mapa Świata', 'worldmap', '', 12.5, 2, 3, 2, 1),
    ],
    enemies: {
        blackDemon: enemy('Czarny Demon', 'demon_cz_s.gif', 1223, 144, 219, 409, 1670),
        boneLord: enemy('Władca Kości', 'bonelord.gif', 1490, 175, 266, 438, 1786),
        cerberus: enemy('Cerber', 'cerber.gif', 1757, 207, 314, 551, 2246),
        founder: enemy('Założyciel', 'zalozyciel.gif', 2223, 262, 397, 706, 2880),
    },
    eliteEnemies: {
        veryEvilPatrick: enemy('Bardzo Zły Patryk', 'bardzozlypatryk.gif', 4447, 144, 219, 1694, 11520),
    },
    elite2Enemies: {
        founder: enemy('Założyciel', 'zalozyciel.gif', 4225, 178, 270, 2824, 19296),
    },
    heroEnemies: {
        blackDemon: enemy('Czarny Demon', 'demon_cz_s.gif', 4558, 178, 270, 4165, 31680),
    },
    arenaEnemies: {
        easy: ['blackDemon', 'boneLord'],
        medium: ['cerberus', 'boneLord'],
        hard: ['founder', 'cerberus'],
    },
});

const ZORYAN: GameMapData = buildMap(10, {
    npcs: [
        npc('zoryan-warden', 'Strażniczka Jutrzenka', 'zoryan-warden.png', 12, 10.9062, 32, 48),
        npc('zoryan-master', 'Mistrz Wid', 'zoryan-master.png', 8.9062, 7.0938, 32, 48),
        npc('zoryan-herald', 'Herold Blask', 'zoryan-herald.png', 15.3125, 7.0938, 32, 48),
        npc('zoryan-guard', 'Straż Świtu', 'zoryan-guard.png', 12, 2.9062, 32, 48),
    ],
    locations: [
        battle(
            'zoryan-marble-gate',
            'Marmurowe Wrota',
            '031.jpg',
            3,
            2.5,
            4,
            3,
            90,
            91,
            95,
            ['founder', 'veryEvilPatrick'],
            3,
        ),
        battle(
            'zoryan-dawn-throne',
            'Tron Zorzy',
            '033.jpg',
            22,
            2.5,
            4,
            3,
            95,
            96,
            100,
            ['blackDemon', 'boneLord'],
            3,
        ),
        location('zoryan-arena', 'Arena', 'arena', '001.jpg', 21.5, 13, 5, 4, 3, { levelReq: 90 }),
        location('zoryan-tough', 'Mocny przeciwnik', 'toughenemy', '034.jpg', 2.5, 12.5, 3, 3, 3),
        location('zoryan-inn', 'Gospoda Ostatniego Świtu', 'rest', '025.jpg', 19, 5.5, 4, 3, 1),
        shopLocation('zoryan-shop', 'Skarbiec Zoryanu', '001.jpg', 6, 5.5, 4, 3, 'blacksmith_6'),
        location('zoryan-world', 'Mapa Świata', 'worldmap', '', 12.5, 2, 3, 2, 1),
    ],
    enemies: {
        founder: enemy('Założyciel', 'zalozyciel.gif', 2124, 232, 353, 458, 3341),
        veryEvilPatrick: enemy('Bardzo Zły Patryk', 'bardzozlypatryk.gif', 2586, 283, 429, 489, 3571),
        blackDemon: enemy('Czarny Demon', 'demon_cz_s.gif', 3050, 334, 506, 615, 4493),
        boneLord: enemy('Władca Kości', 'bonelord.gif', 3861, 422, 641, 789, 5760),
    },
    eliteEnemies: {
        boneLord: enemy('Władca Kości', 'bonelord.gif', 6715, 207, 315, 1894, 23040),
    },
    elite2Enemies: {
        veryEvilPatrick: enemy('Bardzo Zły Patryk', 'bardzozlypatryk.gif', 6379, 256, 389, 3156, 38592),
    },
    heroEnemies: {
        founder: enemy('Założyciel', 'zalozyciel.gif', 8948, 256, 389, 4655, 63360),
    },
    arenaEnemies: {
        easy: ['founder', 'veryEvilPatrick'],
        medium: ['blackDemon', 'veryEvilPatrick'],
        hard: ['boneLord', 'blackDemon'],
    },
});

export const MAPS: Record<number, GameMapData> = {
    1: OLSZAWA,
    2: RUDZIN,
    3: WIELGRAD,
    4: CZARNOBOR,
    5: SOLWAR,
    6: NIHRAST,
    7: ZHURMAT,
    8: GRZMIEL,
    9: ISMERIA,
    10: ZORYAN,
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

/**
 * The two largest bags, carried by every shop from Czarnobór on.
 *
 * Shared rather than copied so the late-game shops cannot drift apart on the
 * one item a player is guaranteed to want.
 */
const HIGH_TIER_BAGS: Item[] = [
    shopItem(
        731,
        'Plecak Poszukiwacza',
        'items/bag_backpack.png',
        'bag',
        'heroic',
        30,
        { bagSlots: 12 },
        40000,
    ),
    // The ceiling: `MAX_BAG_SLOTS` on top of the base backpack.
    shopItem(
        732,
        'Bezdenny Plecak',
        'items/bag_backpack.png',
        'bag',
        'legendary',
        38,
        { bagSlots: 15 },
        200000,
    ),
];

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

            // Bags. Priced well above gear of the same level: the backpack is
            // the thing that limits how long a player can stay out farming, so
            // widening it should cost a few expeditions' worth of gold.
            shopItem(231, 'Sakiewka', 'items/bag_pouch.png', 'bag', 'common', 1, { bagSlots: 3 }, 400),
            shopItem(
                232,
                'Worek podróżny',
                'items/bag_sack.png',
                'bag',
                'unique',
                6,
                { bagSlots: 5 },
                1600,
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

            // Mid-game tiers around level 15/20/25.
            //
            // This shop serves both Rudzin (level 9+) and Wielgrad (level 20+),
            // so it is the only stock a level 20-30 player can actually reach —
            // blacksmith_3 sits in Czarnobór behind a level 30 gate. Its range used
            // to stop at 18, leaving that stretch with nothing to buy.
            shopItem(
                405,
                'Ostrze Zmierzchu',
                'items/dagger.gif',
                'weapon',
                'unique',
                15,
                { dmgMin: 20, dmgMax: 34, critChance: 6 },
                3000,
            ),
            shopItem(
                423,
                'Talizman Strażnika',
                'items/charm.gif',
                'talisman',
                'heroic',
                15,
                { hp: 45, dodge: 4, stun: 2 },
                2200,
            ),
            shopItem(
                406,
                'Topór Górskiego Klanu',
                'items/axe.gif',
                'weapon',
                'heroic',
                20,
                { dmgMin: 32, dmgMax: 52, critChance: 7, critPower: 22 },
                5500,
            ),
            shopItem(
                414,
                'Kirys Smoczej Straży',
                'items/plate.gif',
                'armor',
                'heroic',
                20,
                { armor: 58, hp: 60, dodge: 5 },
                7000,
            ),
            shopItem(
                424,
                'Pierścień Wichru',
                'items/ring.gif',
                'talisman',
                'heroic',
                20,
                { hp: 70, critChance: 6, critPower: 20 },
                6000,
            ),
            shopItem(
                407,
                'Halabarda Zaćmienia',
                'items/spear.gif',
                'weapon',
                'legendary',
                25,
                { dmgMin: 55, dmgMax: 85, critChance: 9, critPower: 30, doubleDamage: 6 },
                14000,
            ),
            shopItem(
                415,
                'Zbroja Górskiego Klanu',
                'items/chainmail.gif',
                'armor',
                'heroic',
                25,
                { armor: 78, hp: 85, dodge: 6 },
                13000,
            ),
            shopItem(
                425,
                'Amulet Zaćmienia',
                'items/amulet.gif',
                'talisman',
                'legendary',
                25,
                { hp: 120, critChance: 8, critPower: 30, stun: 4 },
                20000,
            ),

            shopItem(
                431,
                'Wzmocniony Worek',
                'items/bag_sack.png',
                'bag',
                'unique',
                12,
                { bagSlots: 7 },
                4500,
            ),
            shopItem(
                432,
                'Torba wędrowca',
                'items/bag_satchel.png',
                'bag',
                'heroic',
                20,
                { bagSlots: 10 },
                13000,
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

            ...HIGH_TIER_BAGS,
        ],
    },

    // ================= Late game =================
    //
    // One shop per two lands, the same way `blacksmith_2` serves Rudzin and
    // Wielgrad. Each carries two tiers: gear for the first land it serves and
    // gear for the second. Stats keep the curve the earlier shops draw —
    // weapons roughly ×1.7 per ten levels, armour ×1.7, health ×1.8 — because
    // enemy damage rises with the level multiplier and armour plus health are
    // the only things that answer it.
    blacksmith_4: {
        id: 'blacksmith_4',
        name: 'Sklep',
        items: [
            shopItem(
                801,
                'Kosa Zmierzchu',
                'items/spear.gif',
                'weapon',
                'heroic',
                42,
                { dmgMin: 260, dmgMax: 390, critChance: 10, critPower: 60 },
                150000,
            ),
            shopItem(
                811,
                'Zbroja Otchłani',
                'items/plate.gif',
                'armor',
                'heroic',
                42,
                { armor: 220, hp: 700, dodge: 10 },
                160000,
            ),
            shopItem(
                821,
                'Amulet Otchłani',
                'items/amulet.gif',
                'talisman',
                'heroic',
                45,
                { hp: 800, critChance: 10, critPower: 60, stun: 8 },
                150000,
            ),
            shopItem(
                802,
                'Ostrze Nihrastu',
                'items/sword.gif',
                'weapon',
                'legendary',
                52,
                { dmgMin: 430, dmgMax: 650, critChance: 12, critPower: 70, doubleDamage: 12 },
                500000,
            ),
            shopItem(
                812,
                'Pancerz Nihrastu',
                'items/plate.gif',
                'armor',
                'legendary',
                52,
                { armor: 360, hp: 1200, dodge: 12, doubleArmor: 12 },
                520000,
            ),
            shopItem(
                822,
                'Runa Nihrastu',
                'items/rune.gif',
                'talisman',
                'legendary',
                55,
                { hp: 1400, critChance: 12, critPower: 70, stun: 10 },
                500000,
            ),
            ...HIGH_TIER_BAGS,
        ],
    },
    blacksmith_5: {
        id: 'blacksmith_5',
        name: 'Sklep',
        items: [
            shopItem(
                901,
                'Trójząb Zhurmatu',
                'items/spear.gif',
                'weapon',
                'heroic',
                62,
                { dmgMin: 790, dmgMax: 1185, critChance: 12, critPower: 80 },
                1500000,
            ),
            shopItem(
                911,
                'Kirys Zhurmatu',
                'items/plate.gif',
                'armor',
                'heroic',
                62,
                { armor: 650, hp: 2250, dodge: 12 },
                1600000,
            ),
            shopItem(
                921,
                'Medalion Zhurmatu',
                'items/medal.gif',
                'talisman',
                'heroic',
                65,
                { hp: 2700, critChance: 12, critPower: 80, stun: 10 },
                1500000,
            ),
            shopItem(
                902,
                'Młot Grzmiela',
                'items/hammer.gif',
                'weapon',
                'legendary',
                72,
                { dmgMin: 1200, dmgMax: 1800, critChance: 14, critPower: 90, doubleDamage: 14 },
                5000000,
            ),
            shopItem(
                912,
                'Zbroja Grzmiela',
                'items/plate.gif',
                'armor',
                'legendary',
                72,
                { armor: 1000, hp: 3400, dodge: 14, doubleArmor: 14 },
                5200000,
            ),
            shopItem(
                922,
                'Pierścień Grzmiela',
                'items/ring.gif',
                'talisman',
                'legendary',
                75,
                { hp: 4000, critChance: 14, critPower: 90, stun: 12 },
                5000000,
            ),
            ...HIGH_TIER_BAGS,
        ],
    },
    blacksmith_6: {
        id: 'blacksmith_6',
        name: 'Sklep',
        items: [
            shopItem(
                1001,
                'Kosa Hilaii',
                'items/spear.gif',
                'weapon',
                'heroic',
                82,
                { dmgMin: 2000, dmgMax: 3000, critChance: 14, critPower: 100 },
                15000000,
            ),
            shopItem(
                1011,
                'Pancerz Hilaii',
                'items/plate.gif',
                'armor',
                'heroic',
                82,
                { armor: 1700, hp: 5800, dodge: 14 },
                16000000,
            ),
            shopItem(
                1021,
                'Talizman Hilaii',
                'items/charm.gif',
                'talisman',
                'heroic',
                85,
                { hp: 6800, critChance: 14, critPower: 100, stun: 12 },
                15000000,
            ),
            shopItem(
                1002,
                'Ostrze Elizji',
                'items/sword.gif',
                'weapon',
                'legendary',
                92,
                { dmgMin: 3400, dmgMax: 5100, critChance: 16, critPower: 110, doubleDamage: 16 },
                50000000,
            ),
            shopItem(
                1012,
                'Pancerz Elizji',
                'items/plate.gif',
                'armor',
                'legendary',
                92,
                { armor: 2900, hp: 9900, dodge: 16, doubleArmor: 16 },
                52000000,
            ),
            shopItem(
                1022,
                'Serce Elizji',
                'items/amulet.gif',
                'talisman',
                'legendary',
                95,
                { hp: 11600, critChance: 16, critPower: 110, stun: 14 },
                50000000,
            ),
            ...HIGH_TIER_BAGS,
        ],
    },
};

/**
 * Stock that follows the player's level.
 *
 * The fixed entries above are hand-tuned for a level bracket and go stale once
 * you outgrow them. This stock is cut from the same curve as the loot instead,
 * so every shop always carries gear worth wearing at the level you walk in at —
 * one plain and one unique piece per slot, plus the bag of the moment.
 *
 * It used to grow by a flat 12% a level while prices grew by 25%, which by the
 * late game meant paying millions for a sword that a level 10 enemy would have
 * dropped. The markup below is what keeps the loot worth picking up: buying is
 * roughly six sold drops, so the shop is the floor and the drops are the climb.
 */
const SHOP_PRICE_MARKUP = 3;

/** Which base of the tier a shop stocks — first is the plainest of its type. */
type ScaledSlot = {
    id: number;
    type: 'weapon' | 'armor' | 'talisman';
    rarity: ItemRarityValue;
    baseIndex: number;
};

const SCALED_SHOP_SLOTS: ScaledSlot[] = [
    { id: 901, type: 'weapon', rarity: 'common', baseIndex: 0 },
    { id: 902, type: 'weapon', rarity: 'unique', baseIndex: 1 },
    { id: 911, type: 'armor', rarity: 'common', baseIndex: 0 },
    { id: 912, type: 'armor', rarity: 'unique', baseIndex: 1 },
    { id: 921, type: 'talisman', rarity: 'unique', baseIndex: 0 },
];

export function scaledShopItems(playerLevel: number): Item[] {
    const level = Math.max(1, playerLevel);
    const tier = gearTierFor(level);

    const items = SCALED_SHOP_SLOTS.map((slot) =>
        createGearItem({
            type: slot.type,
            level,
            rarity: slot.rarity,
            base: tier[slot.type][slot.baseIndex % tier[slot.type].length],
            // No quality roll: the shop window has to show the same item the
            // purchase rebuilds, and a plain name reads better on a price tag.
            prefixed: false,
            priceFactor: SHOP_PRICE_MARKUP,
            // Namespaced so a scaled entry can never collide with a fixed one.
            id: `scaled_${slot.id}`,
        }),
    );

    const bags = bagBasesFor(level);

    items.push(
        createBagItem({
            level,
            rarity: 'common',
            // The largest model the level has unlocked, so the shop is always
            // the reliable way to widen the backpack.
            base: bags[bags.length - 1],
            maxSlots: MAX_BAG_SLOTS,
            prefixed: false,
            priceFactor: SHOP_PRICE_MARKUP,
            id: 'scaled_931',
        }),
    );

    return items;
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
