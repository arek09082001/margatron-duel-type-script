/**
 * What a piece of gear *is*: the tier catalogue plus the one builder that turns
 * a (type, level, rarity) into a finished item.
 *
 * Both loot and the level-scaled shop stock come out of here, so a drop and a
 * shop item of the same level are always measured against the same curve —
 * which is what makes one comparable to the other in the tooltip.
 *
 * Gear is cut into ten tiers, one per land. A tier changes the *look and the
 * name* (`Stalowy Topór` → `Smoczy Topór`), never the maths: the numbers come
 * from `gearCurve`, so a base is never stronger than the level it dropped at.
 */

import { assetUrl } from './assets';
import { ITEM_TYPE_LABELS, RARITY_META } from './enums';
import { armorBudget, healthBudget, itemValueBudget, weaponDamageBudget } from './gearCurve';
import { pick, randomId, randomInt, shuffled } from './rng';
import type { BonusStat, Item, ItemRarityValue, ItemStats, StatKey } from './types';

/** The three types built from the level curve; potions and bags are their own thing. */
export type GearTypeValue = 'weapon' | 'armor' | 'talisman';

/** Polish adjectives agree with the noun, so every base carries its gender. */
export type Gender = 'm' | 'f' | 'n';

/** Masculine / feminine / neuter form of one adjective. */
export type AdjectiveForms = readonly [string, string, string];

export type GearBase = {
    /** The noun a generated name ends with, e.g. `Topór`. */
    noun: string;
    gender: Gender;
    image: string;
    /** Weapons: multiplier on the level's damage budget. */
    damage: number;
    /** Weapons: half-width of the min–max band, as a fraction of the average. */
    spread: number;
    /** Armour: multiplier on the level's armour budget. */
    armor: number;
    /** Armour and talismans: share of the level's health budget. */
    health: number;
    /** Bonus stats this base rolls before anything else in its pool. */
    affinity: StatKey[];
};

type ShapeProfile = Omit<GearBase, 'image'>;

export type GearTier = {
    /** 1-based; tier N is the gear of land N. */
    index: number;
    minLevel: number;
    adjective: AdjectiveForms;
    weapon: GearBase[];
    armor: GearBase[];
    talisman: GearBase[];
};

/**
 * Shapes, and what each one is good at.
 *
 * The factors are what makes two drops of the same level worth comparing: a
 * hammer hits harder but rolls in a narrow band, a dagger is the weakest swing
 * in the tier but rolls towards crit. Every factor sits within ±20% of the
 * curve, so no shape is a trap.
 */
const WEAPON_SHAPES: Record<string, ShapeProfile> = {
    club: { noun: 'Maczuga', gender: 'f', damage: 1.02, spread: 0.35, armor: 0, health: 0, affinity: ['stun'] },
    dagger: {
        noun: 'Sztylet',
        gender: 'm',
        damage: 0.84,
        spread: 0.22,
        armor: 0,
        health: 0,
        affinity: ['critChance'],
    },
    sword: {
        noun: 'Miecz',
        gender: 'm',
        damage: 1.0,
        spread: 0.28,
        armor: 0,
        health: 0,
        affinity: ['critChance', 'critPower'],
    },
    axe: { noun: 'Topór', gender: 'm', damage: 1.08, spread: 0.38, armor: 0, health: 0, affinity: ['critPower'] },
    hammer: { noun: 'Młot', gender: 'm', damage: 1.12, spread: 0.2, armor: 0, health: 0, affinity: ['stun'] },
    spear: {
        noun: 'Włócznia',
        gender: 'f',
        damage: 0.94,
        spread: 0.3,
        armor: 0,
        health: 0,
        affinity: ['critChance'],
    },
    scythe: { noun: 'Kosa', gender: 'f', damage: 1.05, spread: 0.34, armor: 0, health: 0, affinity: ['critPower'] },
    mace: { noun: 'Buława', gender: 'f', damage: 1.03, spread: 0.24, armor: 0, health: 0, affinity: ['stun'] },
    glaive: {
        noun: 'Glewia',
        gender: 'f',
        damage: 1.0,
        spread: 0.32,
        armor: 0,
        health: 0,
        affinity: ['critChance', 'stun'],
    },
    greatsword: {
        noun: 'Ostrze',
        gender: 'n',
        damage: 1.15,
        spread: 0.42,
        armor: 0,
        health: 0,
        affinity: ['critPower'],
    },
};

/** Cloth trades armour for health, plate the other way round. */
const ARMOR_SHAPES: Record<string, ShapeProfile> = {
    padded: { noun: 'Kaftan', gender: 'm', damage: 0, spread: 0, armor: 0.72, health: 0.42, affinity: ['dodge'] },
    leather: { noun: 'Zbroja', gender: 'f', damage: 0, spread: 0, armor: 0.85, health: 0.38, affinity: ['dodge'] },
    chain: { noun: 'Kolczuga', gender: 'f', damage: 0, spread: 0, armor: 1.0, health: 0.33, affinity: ['stun'] },
    breastplate: {
        noun: 'Napierśnik',
        gender: 'm',
        damage: 0,
        spread: 0,
        armor: 1.12,
        health: 0.3,
        affinity: ['stun'],
    },
    robe: { noun: 'Szata', gender: 'f', damage: 0, spread: 0, armor: 0.6, health: 0.55, affinity: ['dodge'] },
    cuirass: { noun: 'Kirys', gender: 'm', damage: 0, spread: 0, armor: 1.2, health: 0.28, affinity: ['stun'] },
    cloak: { noun: 'Peleryna', gender: 'f', damage: 0, spread: 0, armor: 0.65, health: 0.45, affinity: ['dodge'] },
    plate: { noun: 'Pancerz', gender: 'm', damage: 0, spread: 0, armor: 1.3, health: 0.25, affinity: ['stun'] },
};

/** Talismans carry the larger half of the health budget and pick a percentage. */
const TALISMAN_SHAPES: Record<string, ShapeProfile> = {
    ring: {
        noun: 'Pierścień',
        gender: 'm',
        damage: 0,
        spread: 0,
        armor: 0,
        health: 0.45,
        affinity: ['critChance'],
    },
    charm: { noun: 'Talizman', gender: 'm', damage: 0, spread: 0, armor: 0, health: 0.55, affinity: ['dodge'] },
    amulet: {
        noun: 'Amulet',
        gender: 'm',
        damage: 0,
        spread: 0,
        armor: 0,
        health: 0.75,
        affinity: ['critChance'],
    },
    rune: { noun: 'Runa', gender: 'f', damage: 0, spread: 0, armor: 0, health: 0.55, affinity: ['critPower'] },
    medallion: {
        noun: 'Medalion',
        gender: 'm',
        damage: 0,
        spread: 0,
        armor: 0,
        health: 0.68,
        affinity: ['critChance', 'critPower'],
    },
    gem: { noun: 'Klejnot', gender: 'm', damage: 0, spread: 0, armor: 0, health: 0.5, affinity: ['critPower'] },
    eye: {
        noun: 'Oko',
        gender: 'n',
        damage: 0,
        spread: 0,
        armor: 0,
        health: 0.52,
        affinity: ['dodge', 'critChance'],
    },
    heart: { noun: 'Serce', gender: 'n', damage: 0, spread: 0, armor: 0, health: 0.85, affinity: ['stun'] },
};

const SHAPES: Record<GearTypeValue, Record<string, ShapeProfile>> = {
    weapon: WEAPON_SHAPES,
    armor: ARMOR_SHAPES,
    talisman: TALISMAN_SHAPES,
};

function bases(tier: number, type: GearTypeValue, shapes: string[]): GearBase[] {
    return shapes.map((shape) => ({
        ...SHAPES[type][shape],
        image: `items/gear/t${String(tier).padStart(2, '0')}_${shape}.png`,
    }));
}

function gearTier(
    index: number,
    minLevel: number,
    adjective: AdjectiveForms,
    shapes: { weapon: string[]; armor: string[]; talisman: string[] },
): GearTier {
    return {
        index,
        minLevel,
        adjective,
        weapon: bases(index, 'weapon', shapes.weapon),
        armor: bases(index, 'armor', shapes.armor),
        talisman: bases(index, 'talisman', shapes.talisman),
    };
}

/**
 * One tier per land, and the shapes rotate as you climb so the backpack keeps
 * looking different — Olszawa hands out clubs and rusty daggers, Zoryan hands out
 * greatswords and hearts.
 */
export const GEAR_TIERS: GearTier[] = [
    gearTier(1, 1, ['Zardzewiały', 'Zardzewiała', 'Zardzewiałe'], {
        weapon: ['club', 'dagger', 'sword'],
        armor: ['padded', 'leather'],
        talisman: ['ring', 'charm'],
    }),
    gearTier(2, 11, ['Żelazny', 'Żelazna', 'Żelazne'], {
        weapon: ['sword', 'axe', 'spear'],
        armor: ['leather', 'chain'],
        talisman: ['ring', 'amulet'],
    }),
    gearTier(3, 21, ['Stalowy', 'Stalowa', 'Stalowe'], {
        weapon: ['sword', 'axe', 'hammer'],
        armor: ['chain', 'breastplate'],
        talisman: ['amulet', 'rune'],
    }),
    gearTier(4, 31, ['Srebrny', 'Srebrna', 'Srebrne'], {
        weapon: ['spear', 'mace', 'sword'],
        armor: ['breastplate', 'robe'],
        talisman: ['medallion', 'rune'],
    }),
    gearTier(5, 41, ['Kryształowy', 'Kryształowa', 'Kryształowe'], {
        weapon: ['sword', 'scythe', 'dagger'],
        armor: ['cuirass', 'robe'],
        talisman: ['gem', 'amulet'],
    }),
    gearTier(6, 51, ['Obsydianowy', 'Obsydianowa', 'Obsydianowe'], {
        weapon: ['axe', 'glaive', 'hammer'],
        armor: ['cuirass', 'cloak'],
        talisman: ['gem', 'eye'],
    }),
    gearTier(7, 61, ['Smoczy', 'Smocza', 'Smocze'], {
        weapon: ['greatsword', 'scythe', 'spear'],
        armor: ['plate', 'chain'],
        talisman: ['heart', 'medallion'],
    }),
    gearTier(8, 71, ['Demoniczny', 'Demoniczna', 'Demoniczne'], {
        weapon: ['greatsword', 'axe', 'mace'],
        armor: ['plate', 'cuirass'],
        talisman: ['eye', 'heart'],
    }),
    gearTier(9, 81, ['Widmowy', 'Widmowa', 'Widmowe'], {
        weapon: ['scythe', 'glaive', 'dagger'],
        armor: ['robe', 'plate'],
        talisman: ['rune', 'gem'],
    }),
    gearTier(10, 91, ['Elizejski', 'Elizejska', 'Elizejskie'], {
        weapon: ['greatsword', 'hammer', 'spear'],
        armor: ['plate', 'cuirass'],
        talisman: ['heart', 'amulet'],
    }),
];

export function gearTierFor(level: number): GearTier {
    let tier = GEAR_TIERS[0];

    for (const candidate of GEAR_TIERS) {
        if (level >= candidate.minLevel) {
            tier = candidate;
        }
    }

    return tier;
}

export type BagBase = {
    noun: string;
    gender: Gender;
    image: string;
    /** Slots before the rarity bonus. */
    bagSlots: number;
    /**
     * The enemy level a drop has to reach for this bag to appear.
     *
     * Capacity is permanent quality-of-life rather than a stat curve, so bags
     * are gated by level here instead of being scaled like weapons and armour.
     */
    minLevel: number;
};

export const BAG_BASES: BagBase[] = [
    { noun: 'Mieszek', gender: 'm', image: 'items/bag_pouch.png', bagSlots: 2, minLevel: 1 },
    { noun: 'Worek podróżny', gender: 'm', image: 'items/bag_sack.png', bagSlots: 4, minLevel: 8 },
    { noun: 'Tobołek wędrowca', gender: 'm', image: 'items/bag_satchel.png', bagSlots: 6, minLevel: 18 },
    { noun: 'Plecak', gender: 'm', image: 'items/bag_backpack.png', bagSlots: 8, minLevel: 28 },
    { noun: 'Sakwa', gender: 'f', image: 'items/bag_saddlebag.png', bagSlots: 10, minLevel: 45 },
    { noun: 'Kufer', gender: 'm', image: 'items/bag_chest.png', bagSlots: 12, minLevel: 65 },
];

export type PotionBase = {
    noun: string;
    gender: Gender;
    image: string;
    effect: { type: string; value: number };
};

export const POTION_BASES: PotionBase[] = [
    { noun: 'Butelka PA', gender: 'f', image: 'items/pa.gif', effect: { type: 'pa', value: 5 } },
];

/**
 * Rarity prefixes in all three genders.
 *
 * The single masculine form the catalogue used to carry is why bags had to be
 * named masculine; with the forms here `Mocna Sakwa` and `Mityczne Serce` come
 * out right too.
 */
export const RARITY_PREFIXES: Partial<Record<ItemRarityValue, AdjectiveForms[]>> = {
    unique: [
        ['Mocny', 'Mocna', 'Mocne'],
        ['Wzmocniony', 'Wzmocniona', 'Wzmocnione'],
        ['Zaklęty', 'Zaklęta', 'Zaklęte'],
        ['Mistyczny', 'Mistyczna', 'Mistyczne'],
    ],
    heroic: [
        ['Bohaterski', 'Bohaterska', 'Bohaterskie'],
        ['Epicki', 'Epicka', 'Epickie'],
        ['Potężny', 'Potężna', 'Potężne'],
        ['Starożytny', 'Starożytna', 'Starożytne'],
    ],
    legendary: [
        ['Legendarny', 'Legendarna', 'Legendarne'],
        ['Mityczny', 'Mityczna', 'Mityczne'],
        ['Boski', 'Boska', 'Boskie'],
        ['Nieśmiertelny', 'Nieśmiertelna', 'Nieśmiertelne'],
    ],
};

const GENDER_INDEX: Record<Gender, number> = { m: 0, f: 1, n: 2 };

function inflect(forms: AdjectiveForms, gender: Gender): string {
    return forms[GENDER_INDEX[gender]];
}

function rarityPrefix(rarity: ItemRarityValue, gender: Gender): string {
    const forms = RARITY_PREFIXES[rarity];

    return forms && forms.length > 0 ? `${inflect(pick(forms), gender)} ` : '';
}

type BonusStatDefinition = {
    key: StatKey;
    name: string;
    suffix: string;
    min: number;
    max: number;
};

/**
 * Bonus stats are percentages, and percentages must not ride the level curve.
 *
 * They used to be multiplied by `1 + poziom * 0,1`, which meant a level 50 drop
 * alone parked the player on the 50% crit and 40% dodge ceilings and everything
 * found later was wasted. Now they grow only with tier and rarity, slowly enough
 * that a full set of tier 10 legendaries lands just under the caps.
 */
const BONUS_STAT_POOL: Record<GearTypeValue, BonusStatDefinition[]> = {
    weapon: [
        { key: 'critChance', name: 'Szansa krytyka', suffix: '%', min: 1, max: 4 },
        { key: 'critPower', name: 'Moc krytyka', suffix: '%', min: 6, max: 18 },
        { key: 'stun', name: 'Ogłuszenie', suffix: '%', min: 1, max: 4 },
    ],
    armor: [
        { key: 'dodge', name: 'Unik', suffix: '%', min: 1, max: 3 },
        { key: 'stun', name: 'Ogłuszenie', suffix: '%', min: 1, max: 3 },
        { key: 'critChance', name: 'Szansa krytyka', suffix: '%', min: 1, max: 2 },
    ],
    talisman: [
        { key: 'critChance', name: 'Szansa krytyka', suffix: '%', min: 1, max: 4 },
        { key: 'critPower', name: 'Moc krytyka', suffix: '%', min: 6, max: 20 },
        { key: 'dodge', name: 'Unik', suffix: '%', min: 1, max: 3 },
        { key: 'stun', name: 'Ogłuszenie', suffix: '%', min: 2, max: 5 },
    ],
};

const TIER_PERCENT_GROWTH = 0.12;

/** How far a rolled item may sit off the curve: ±15%, in 0.1% steps. */
export function rollQuality(): number {
    return 0.85 + randomInt(0, 300) / 1000;
}

function bonusStatsFor(
    type: GearTypeValue,
    base: GearBase,
    tier: GearTier,
    rarity: ItemRarityValue,
): Record<string, BonusStat> {
    const meta = RARITY_META[rarity];
    const count = Math.min(meta.bonusStats, BONUS_STAT_POOL[type].length);

    if (count <= 0) {
        return {};
    }

    // The base's affinity rolls first, so a dagger really is the crit weapon of
    // its tier even when it only gets one bonus stat.
    const pool = BONUS_STAT_POOL[type];
    const affinity = base.affinity
        .map((key) => pool.find((definition) => definition.key === key))
        .filter((definition): definition is BonusStatDefinition => definition !== undefined);
    const rest = shuffled(pool.filter((definition) => !affinity.includes(definition)));
    const scale = (1 + (tier.index - 1) * TIER_PERCENT_GROWTH) * meta.percentMultiplier;

    const bonusStats: Record<string, BonusStat> = {};

    for (const definition of [...affinity, ...rest].slice(0, count)) {
        bonusStats[definition.key] = {
            value: Math.max(1, Math.round(randomInt(definition.min, definition.max) * scale)),
            name: definition.name,
            suffix: definition.suffix,
        };
    }

    return bonusStats;
}

function flattenBonusStats(bonusStats: Record<string, BonusStat>): ItemStats {
    const flattened: ItemStats = {};

    for (const [key, bonus] of Object.entries(bonusStats)) {
        flattened[key as StatKey] = bonus.value;
    }

    return flattened;
}

/**
 * One number the shop can sort every slot by.
 *
 * The weights are the exchange rate the curve is built on: a point of armour is
 * worth about six points of health, and a percentage point is worth a chunk of
 * either. It is a display and sorting figure, not something the battle reads.
 */
function itemPower(stats: ItemStats, effect: { value: number } | null): number {
    const percentSum =
        (stats.critChance ?? 0) + (stats.critPower ?? 0) + (stats.dodge ?? 0) + (stats.stun ?? 0);

    const damage = ((stats.dmgMin ?? 0) + (stats.dmgMax ?? 0)) / 2;

    return Math.max(
        1,
        Math.round(
            damage * 6 +
                (stats.armor ?? 0) * 6 +
                (stats.hp ?? 0) * 0.6 +
                percentSum * 20 +
                (stats.bagSlots ?? 0) * 120 +
                (effect?.value ?? 0) * 2,
        ),
    );
}

type FinalizeInput = {
    id: string;
    name: string;
    image: string;
    type: Item['type'];
    rarity: ItemRarityValue;
    level: number;
    stats: ItemStats;
    bonusStats: Record<string, BonusStat>;
    price: number;
    effect?: { type: string; value: number } | null;
};

/** Shared tail of every generated item: the display fields and the flattened stats. */
function finalize(input: FinalizeInput): Item {
    const meta = RARITY_META[input.rarity];
    const effect = input.effect ?? null;

    return {
        id: input.id,
        name: input.name,
        icon: input.image,
        image: input.image,
        imageUrl: assetUrl(input.image),
        type: input.type,
        itemType: input.type,
        itemTypeName: ITEM_TYPE_LABELS[input.type],
        rarity: input.rarity,
        rarityName: meta.label,
        rarityColor: meta.color,
        rarityCss: meta.cssClass,
        level: input.level,
        stats: input.stats,
        bonusStats: input.bonusStats,
        effect: effect?.type ?? null,
        effectValue: effect?.value ?? null,
        effectData: effect,
        power: itemPower(input.stats, effect),
        price: Math.max(1, Math.round(input.price)),
        quantity: 1,
        ...input.stats,
    };
}

export type GearOptions = {
    type: GearTypeValue;
    level: number;
    rarity: ItemRarityValue;
    /** Defaults to a random base of the level's tier. */
    base?: GearBase;
    /** 1 sits exactly on the curve; drops roll `rollQuality()`. */
    quality?: number;
    /** Shops name their stock plainly, drops wear the rarity prefix. */
    prefixed?: boolean;
    /** Shops charge a markup on top of what the same item sells for. */
    priceFactor?: number;
    id?: string;
};

export function createGearItem(options: GearOptions): Item {
    const { type, level, rarity, quality = 1, prefixed = true, priceFactor = 1 } = options;

    const tier = gearTierFor(level);
    const base = options.base ?? pick(tier[type]);
    const meta = RARITY_META[rarity];
    const scale = meta.statMultiplier * quality;

    const bonusStats = bonusStatsFor(type, base, tier, rarity);
    let stats: ItemStats = {};

    if (type === 'weapon') {
        const average = weaponDamageBudget(level) * base.damage * scale;

        stats = {
            dmgMin: Math.max(1, Math.round(average * (1 - base.spread))),
            dmgMax: Math.max(2, Math.round(average * (1 + base.spread))),
        };
    } else if (type === 'armor') {
        stats = {
            armor: Math.max(1, Math.round(armorBudget(level) * base.armor * scale)),
            hp: Math.max(1, Math.round(healthBudget(level) * base.health * scale)),
        };
    } else {
        stats = { hp: Math.max(1, Math.round(healthBudget(level) * base.health * scale)) };
    }

    stats = { ...stats, ...flattenBonusStats(bonusStats) };

    const prefix = prefixed ? rarityPrefix(rarity, base.gender) : '';
    const name = `${prefix}${inflect(tier.adjective, base.gender)} ${base.noun}`;

    return finalize({
        id: options.id ?? randomId('drop_'),
        name,
        image: base.image,
        type,
        rarity,
        level,
        stats,
        bonusStats,
        price: itemValueBudget(level) * meta.priceMultiplier * quality * priceFactor,
    });
}

/**
 * Bags a drop of this level may hand out.
 *
 * Only the three newest models, so the backpack keeps growing: at level 90 a
 * `Mieszek` would be litter, and it is the one item type whose value does not
 * scale with the level it dropped at.
 */
export function bagBasesFor(level: number): BagBase[] {
    const unlocked = BAG_BASES.filter((base) => base.minLevel <= level);

    return unlocked.length > 0 ? unlocked.slice(-3) : [BAG_BASES[0]];
}

export function createBagItem(options: {
    level: number;
    rarity: ItemRarityValue;
    base?: BagBase;
    maxSlots: number;
    prefixed?: boolean;
    priceFactor?: number;
    id?: string;
}): Item {
    const { level, rarity, maxSlots, prefixed = true, priceFactor = 1 } = options;
    const base = options.base ?? pick(bagBasesFor(level));
    const meta = RARITY_META[rarity];
    const bagSlots = Math.min(maxSlots, Math.max(1, base.bagSlots + meta.bagSlotBonus));
    const stats: ItemStats = { bagSlots };
    const prefix = prefixed ? rarityPrefix(rarity, base.gender) : '';

    return finalize({
        id: options.id ?? randomId('drop_'),
        name: `${prefix}${base.noun}`,
        image: base.image,
        type: 'bag',
        rarity,
        // A bag is worth the same whatever killed it, so it requires — and is
        // priced at — the level of the model rather than the level of the kill.
        level: base.minLevel,
        stats,
        bonusStats: {},
        // Four times a normal item of that level: capacity is the one upgrade
        // that never goes stale, so it should cost a few expeditions' worth.
        price: itemValueBudget(base.minLevel) * 4 * meta.priceMultiplier * priceFactor,
    });
}

export function createPotionItem(options: {
    level: number;
    rarity: ItemRarityValue;
    value: number;
    base?: PotionBase;
    id?: string;
}): Item {
    const { level, rarity, value } = options;
    const base = options.base ?? pick(POTION_BASES);

    return finalize({
        id: options.id ?? randomId('drop_'),
        name: base.noun,
        image: base.image,
        type: 'potion',
        rarity,
        level,
        stats: {},
        bonusStats: {},
        effect: { type: base.effect.type, value },
        // Priced against the PA the inn sells, so drinking one is worth about
        // what buying the same points costs.
        price: value * 2.2 * Math.max(1, level),
    });
}
