/**
 * One shop per town, stocked for *that town's* ten levels.
 *
 * The stock used to be six hand-written shops shared between the ten lands,
 * plus a rotation that followed the player's own level — so every shop in the
 * world sold the same thing, whichever town you walked into, and a level 60
 * character found level 60 gear on Olszawa's anvil. Nothing about where you were
 * mattered, and half the fixed entries were unreachable: `blacksmith_3` sat
 * behind Czarnobór's level 30 gate while `blacksmith_2` had to cover 9 to 30.
 *
 * Now a shop belongs to its land. Olszawa sells levels 1-10 forever, Rudzin
 * 11-20, and so on to Zoryan's 91-100 — the same bands as `MAP_META`, which is
 * also where the gear tiers change, so a town's shelves are always cut from that
 * town's tier. Walking into a new land is the upgrade; the shop no longer
 * follows you around.
 *
 * Within a band the shelves climb in four steps, three levels apart, from plain
 * gear at the band's first level to one legendary piece at its last. That is the
 * progression a player feels: arrive, afford the bottom of the shelf, and leave
 * having worked up to the top of it.
 */

import { MAX_BAG_SLOTS } from './config';
import { MAP_META } from './enums';
import { GameError } from './errors';
import {
    BAG_BASES,
    type BagBase,
    type GearTypeValue,
    createBagItem,
    createGearItem,
    createPotionItem,
    gearTierFor,
} from './gear';
import { seededRandom } from './rng';
import type { Item, ItemRarityValue, Shop } from './types';

/**
 * What a shop charges over what the same item sells for.
 *
 * Kept from the old rotation: buying is roughly six sold drops, so the shop is
 * the floor of a player's gear and the drops are the climb.
 */
const SHOP_PRICE_MARKUP = 3;

/**
 * Bags are marked up less, because `createBagItem` already prices them at four
 * times a normal item of their level. At the full markup the last backpack in
 * the game would cost more than every other purchase of the run put together.
 */
const BAG_PRICE_MARKUP = 2;

/** The building each town's shop lives in — also the label on the town map. */
const SHOP_NAMES: Record<number, string> = {
    1: 'Kuźnia',
    2: 'Kuźnia',
    3: 'Zbrojownia',
    4: 'Skład Traperski',
    5: 'Skład Portowy',
    6: 'Kuźnia Żarowa',
    7: 'Bazar Zhurmatu',
    8: 'Płatnerz',
    9: 'Zbrojownia Wygnańców',
    10: 'Skarbiec Zoryanu',
};

/**
 * The four rungs of a shop's shelf, as offsets into the town's level band.
 *
 * Two rarities per rung, climbing: the first level of a land is plain gear you
 * can afford on arrival, its last level is the heroic and legendary pieces you
 * leave wearing.
 */
const STOCK_STEPS: ReadonlyArray<{ levelOffset: number; rarities: readonly ItemRarityValue[] }> = [
    { levelOffset: 0, rarities: ['common', 'unique'] },
    { levelOffset: 3, rarities: ['common', 'unique'] },
    { levelOffset: 6, rarities: ['unique', 'heroic'] },
    { levelOffset: 9, rarities: ['heroic', 'legendary'] },
];

const GEAR_SLOTS: readonly GearTypeValue[] = ['weapon', 'armor', 'talisman'];

/** Action-point flasks, so a shop is worth a visit even in full gear. */
const POTION_STOCK: ReadonlyArray<{ rarity: ItemRarityValue; value: number }> = [
    { rarity: 'common', value: 5 },
    { rarity: 'heroic', value: 15 },
];

export function townShopId(mapId: number): string {
    return `shop_${mapId}`;
}

export function townShopName(mapId: number): string {
    return SHOP_NAMES[mapId] ?? 'Sklep';
}

/**
 * Every piece of gear a town stocks.
 *
 * Bases rotate with both the rung and the slot, so a shop shows off most of its
 * tier's shapes instead of the same sword four times at rising rarities.
 */
function gearStock(mapId: number, levelMin: number): Item[] {
    const items: Item[] = [];

    STOCK_STEPS.forEach((step, rung) => {
        const level = levelMin + step.levelOffset;
        const tier = gearTierFor(level);

        step.rarities.forEach((rarity, rarityIndex) => {
            GEAR_SLOTS.forEach((type, slotIndex) => {
                const bases = tier[type];
                const cursor = rung * step.rarities.length + rarityIndex + slotIndex;
                const id = `shop_${mapId}_${type}_${level}_${rarity}`;

                items.push(
                    createGearItem({
                        type,
                        level,
                        rarity,
                        base: bases[cursor % bases.length],
                        // Shop stock sits exactly on the curve and is named
                        // plainly: a price tag reads better without a prefix,
                        // and a drop needs somewhere to beat.
                        prefixed: false,
                        priceFactor: SHOP_PRICE_MARKUP,
                        id,
                        // Seeded by the id, so the bonus rolls are the same on
                        // every rebuild — the snapshot's, the tooltip's and the
                        // purchase's.
                        rng: seededRandom(id),
                    }),
                );
            });
        });
    });

    return items;
}

/**
 * Bags a town stocks: the two newest models its band has unlocked, the newest of
 * them also in the rarity that land is good for.
 *
 * Capacity is the one upgrade that never goes stale, so it climbs by land rather
 * than by level — and a shop is the reliable way to widen the backpack, because
 * bags are the rarest thing a monster drops.
 */
function bagStock(mapId: number, levelMax: number): Item[] {
    const unlocked = BAG_BASES.filter((base) => base.minLevel <= levelMax);
    const models = unlocked.length > 0 ? unlocked.slice(-2) : [BAG_BASES[0]];
    const newest = models[models.length - 1];
    const capacity: ItemRarityValue = mapId <= 3 ? 'unique' : mapId <= 6 ? 'heroic' : 'legendary';

    const entries: Array<{ base: BagBase; rarity: ItemRarityValue }> = models.map((base) => ({
        base,
        rarity: 'common' as ItemRarityValue,
    }));

    entries.push({ base: newest, rarity: capacity });

    return entries.map(({ base, rarity }) => {
        const id = `shop_${mapId}_bag_${base.minLevel}_${rarity}`;

        return createBagItem({
            level: base.minLevel,
            rarity,
            base,
            maxSlots: MAX_BAG_SLOTS,
            prefixed: false,
            priceFactor: BAG_PRICE_MARKUP,
            id,
            rng: seededRandom(id),
        });
    });
}

function potionStock(mapId: number, levelMin: number): Item[] {
    return POTION_STOCK.map(({ rarity, value }) => {
        const id = `shop_${mapId}_potion_${value}`;

        return createPotionItem({ level: levelMin, rarity, value, id, rng: seededRandom(id) });
    });
}

function townShop(mapId: number): Shop {
    const meta = MAP_META[mapId];

    return {
        id: townShopId(mapId),
        name: townShopName(mapId),
        levelRange: { min: meta.levelMin, max: meta.levelMax },
        items: [
            ...gearStock(mapId, meta.levelMin),
            ...bagStock(mapId, meta.levelMax),
            ...potionStock(mapId, meta.levelMin),
        ],
    };
}

/**
 * Built once at module load rather than per call.
 *
 * The stock depends on nothing but the town, so there is nothing to rebuild —
 * and `buildSnapshot` runs on every clock tick, which is exactly how the old
 * level-scaled rotation ended up rerolling its bonus stats once a second.
 */
export const TOWN_SHOPS: Record<number, Shop> = Object.fromEntries(
    Object.keys(MAP_META)
        .map((mapId) => Number.parseInt(mapId, 10))
        .map((mapId) => [mapId, townShop(mapId)]),
);

export const SHOPS: Record<string, Shop> = Object.fromEntries(
    Object.values(TOWN_SHOPS).map((shop) => [shop.id, shop]),
);

export function getShop(shopId: string): Shop | null {
    return SHOPS[shopId] ?? null;
}

export function requireShop(shopId: string): Shop {
    const shop = getShop(shopId);

    if (!shop) {
        throw new GameError('Nie znaleziono sklepu.');
    }

    return shop;
}
