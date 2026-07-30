/**
 * Port of `app/Game/Repositories/StaticGameCatalogRepository.php`.
 *
 * All content is static, so the maps are built once at module load instead of
 * being rebuilt on every call like the PHP version did. What each town *sells*
 * lives in `shops.ts`, which this only reaches into for the sign over the door.
 */

import { assetUrl } from './assets';
import { STAGES_PER_LOCATION } from './config';
import { ARENA_DIFFICULTY_META, MAP_META } from './enums';
import { GameError } from './errors';
import { townShopId, townShopName } from './shops';
import type {
    ArenaDifficultyValue,
    Enemy,
    EnemyGroup,
    GameLocation,
    GameMapData,
    LocationTypeValue,
    Npc,
    ScaledEnemy,
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

/**
 * A town's shop.
 *
 * Both the label and the `shopId` come from `shops.ts`, so the sign over the
 * door cannot drift from the shelves behind it — and every town has its own,
 * stocked for its own ten levels.
 */
function shopLocation(
    id: string,
    mapId: number,
    image: string,
    x: number,
    y: number,
    width: number,
    height: number,
): GameLocation {
    return location(id, townShopName(mapId), 'shop', image, x, y, width, height, 1, {
        shopId: townShopId(mapId),
    });
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
        shopLocation('olszawa-shop', 1, '001.jpg', 4, 11.5, 4, 3),
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
        shopLocation('rudzin-shop', 2, '001.jpg', 8, 9.5, 4, 3),
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
        shopLocation('wielgrad-shop', 3, '001.jpg', 17, 12.5, 4, 3),
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
        shopLocation('czarnobor-shop', 4, '001.jpg', 8, 6.5, 4, 3),
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
        shopLocation('solwar-shop', 5, '001.jpg', 6, 5.5, 4, 3),
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
        shopLocation('nihrast-shop', 6, '001.jpg', 6, 6.5, 4, 3),
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
        shopLocation('zhurmat-shop', 7, '001.jpg', 6, 5.5, 4, 3),
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
        shopLocation('grzmiel-shop', 8, '001.jpg', 6, 5.5, 4, 3),
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
        shopLocation('ismeria-shop', 9, '001.jpg', 6, 5.5, 4, 3),
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
        shopLocation('zoryan-shop', 10, '001.jpg', 6, 5.5, 4, 3),
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

export function getMap(mapId: number): GameMapData {
    const map = MAPS[mapId];

    if (!map) {
        throw new GameError(`Nieznana mapa [${mapId}].`);
    }

    return map;
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
