/**
 * Core game types.
 *
 * `GameProfile` is the single persisted aggregate — everything the player owns
 * and has progressed through. It is a plain JSON-serialisable object so it can
 * live in a Zustand store today and in a Supabase `game_profiles` row later.
 */

export type ItemTypeValue = 'weapon' | 'armor' | 'talisman' | 'potion';
export type ItemRarityValue = 'common' | 'unique' | 'heroic' | 'legendary';
export type LocationTypeValue = 'battle' | 'arena' | 'toughenemy' | 'shop' | 'rest' | 'worldmap';
export type ArenaDifficultyValue = 'easy' | 'medium' | 'hard';
export type PlayerAttributeKey = 'vitality' | 'strength' | 'luck';
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';
export type ToughEnemyKind = 'elite' | 'elite2' | 'hero';

export type StatKey =
    | 'dmgMin'
    | 'dmgMax'
    | 'armor'
    | 'hp'
    | 'critChance'
    | 'critPower'
    | 'dodge'
    | 'stun'
    | 'strength'
    // Carried on high-end shop items. They feed item power/price but are not
    // consumed by `recalculate` yet — kept so the numbers match the PHP build.
    | 'doubleDamage'
    | 'doubleArmor';

export type ItemStats = Partial<Record<StatKey, number>>;

export type BonusStat = {
    value: number;
    name: string;
    suffix: string;
};

export type ItemEffect = {
    type: string;
    value: number;
};

/**
 * Stat keys are also spread onto the item root (mirroring the PHP resource
 * shape) because the tooltip reads `item.dmgMin` / `item.armor` directly.
 */
export type Item = ItemStats & {
    id: string;
    shopItemId?: number | string;
    name: string;
    icon: string;
    image: string;
    imageUrl: string;
    type: ItemTypeValue;
    itemType: ItemTypeValue;
    itemTypeName: string;
    rarity: ItemRarityValue;
    rarityName: string;
    rarityColor: string;
    rarityCss: string;
    level: number;
    stats: ItemStats;
    bonusStats: Record<string, number | BonusStat>;
    effect: string | null;
    effectValue: number | null;
    effectData: ItemEffect | null;
    power: number;
    price: number;
    quantity: number;
    stackable?: boolean;
};

export type RestTask = {
    minutes: number;
    actionPoints: number;
    /** Epoch milliseconds. */
    endsAt: number;
};

export type Equipped = {
    weapon: Item | null;
    armor: Item | null;
    accessory: Item | null;
};

export type GameProfile = {
    /** Matches the owning local account id (and the Supabase `user_id` later). */
    id: string;
    nick: string;

    level: number;
    exp: number;
    expMax: number;
    gold: number;

    pa: number;
    paMax: number;
    /** Epoch milliseconds of the last action-point regeneration tick. */
    paRegeneratedAt: number;

    playedSeconds: number;
    /** Epoch milliseconds. */
    lastSeenAt: number;

    vitality: number;
    strength: number;
    luck: number;
    vitalityPointsAssigned: number;
    strengthPointsAssigned: number;
    luckPointsAssigned: number;
    attributePoints: number;

    hp: number;
    dmgMin: number;
    dmgMax: number;
    armor: number;
    critChance: number;
    critPower: number;
    dodge: number;
    stun: number;

    monstersKilled: number;
    uniqueItemsFound: number;
    heroicItemsFound: number;
    legendaryItemsFound: number;

    /** Keyed by rest option minutes, e.g. `"1"` / `"5"`. */
    restTasks: Record<string, RestTask>;
    currentMapId: number;
    /** Keyed by `"{mapId}_{locationId}"`. */
    stageProgress: Record<string, number>;
    inventory: Array<Item | null>;
    equipped: Equipped;
};

export type Npc = {
    id: string;
    name: string;
    image: string;
    imageUrl: string;
    x: number;
    y: number;
    width: number;
    height: number;
};

export type Stage = {
    stage: number;
    level: number;
    unlocked: boolean;
    completed: boolean;
};

export type GameLocation = {
    id: string;
    name: string;
    type: LocationTypeValue;
    image: string;
    imageUrl: string;
    x: number;
    y: number;
    width: number;
    height: number;
    pa: number;
    levelReq?: number;
    levelMin?: number;
    levelMax?: number;
    shopId?: string;
    enemies?: string[];
    /** Filled in by the snapshot for battle locations. */
    stages?: Stage[];
    unlockedStage?: number;
};

/** A location decorated with view-only fields by the UI layer. */
export type DecoratedLocation = GameLocation & {
    icon: string;
    description: string;
    paCost: number;
    locked: boolean;
};

export type Enemy = {
    name: string;
    image: string;
    imageUrl: string;
    baseHp: number;
    dmgMin: number;
    dmgMax: number;
    exp: number;
    gold: number;
};

export type ScaledEnemy = Enemy & {
    key: string;
    level: number;
    hp: number;
};

export type EnemyGroup = 'enemies' | 'eliteEnemies' | 'elite2Enemies' | 'heroEnemies';

export type GameMapData = {
    id: number;
    name: string;
    image: string;
    imageUrl: string;
    requiredLevel: number;
    levelRange: { min: number; max: number };
    npcs: Npc[];
    locations: GameLocation[];
    enemies: Record<string, Enemy>;
    eliteEnemies: Record<string, Enemy>;
    elite2Enemies: Record<string, Enemy>;
    heroEnemies: Record<string, Enemy>;
    arenaEnemies: Record<ArenaDifficultyValue, string[]>;
};

export type WorldMapPin = {
    id: number;
    x: number;
    y: number;
    name: string;
    requiredLevel: number;
    locked: boolean;
    current: boolean;
};

export type Shop = {
    id: string;
    name: string;
    items: Item[];
};

export type PaOffer = {
    amount: number;
    price: number;
};

export type RestOptionState = {
    minutes: number;
    durationSeconds: number;
    actionPoints: number;
    active: boolean;
    /** Epoch milliseconds, or null when the option is idle. */
    endsAt: number | null;
    remainingSeconds: number;
};

export type RestState = {
    options: RestOptionState[];
    instant: {
        goldPrice: number;
        targetActionPoints: number;
    };
};

export type ActionPointState = {
    pa: number;
    paMax: number;
    paLimit: number;
    paRegenerationLimit: number;
    paRegenerationSeconds: number;
    /** Epoch milliseconds of the next regeneration tick, or null when full. */
    paRegeneratesAt: number | null;
};

/** The read model the UI renders — derived, never persisted. */
export type PlayerView = ActionPointState & {
    id: string;
    nick: string;
    level: number;
    exp: number;
    expMax: number;
    gold: number;
    vitality: number;
    strength: number;
    luck: number;
    attributePoints: number;
    hp: number;
    dmgMin: number;
    dmgMax: number;
    armor: number;
    critChance: number;
    critPower: number;
    dodge: number;
    stun: number;
    currentMapId: number;
    inventory: Array<Item | null>;
    equipped: Equipped;
};

export type GameSnapshot = {
    user: PlayerView;
    currentMap: GameMapData;
    worldMaps: WorldMapPin[];
    shops: Record<string, Shop>;
    paOffers: PaOffer[];
    rest: RestState;
};

export type BattleParticipant = 'player' | 'enemy';

export type BattleLog =
    | { type: 'battle-start'; enemyName: string }
    | {
          type: 'attack';
          actor: BattleParticipant;
          actorName?: string;
          target: BattleParticipant;
          targetName?: string;
          attackPower: number;
          damage: number;
          remainingHp: number;
          armor?: number;
          critical: boolean;
      }
    | { type: 'dodge'; actor: 'player'; attacker: 'enemy'; attackerName: string }
    | { type: 'reward'; rewardType: 'experience'; amount: number }
    | { type: 'level-up'; level: number }
    | { type: 'attribute-points'; levelsGained: number; points: number }
    | { type: 'drop'; itemName: string; color: string }
    | { type: 'defeat' };

export type LevelUpResult = {
    leveledUp: boolean;
    levelsGained: number;
    oldLevel: number;
    newLevel: number;
    newPaMax: number;
};

export type BattleResult = {
    name: string;
    enemy: ScaledEnemy;
    won: boolean;
    playerHp: number;
    enemyHp: number;
    arenaDifficulty: ArenaDifficultyValue | null;
    log: BattleLog[];
    rewards: {
        exp: number;
        gold: number;
        level: LevelUpResult | null;
        drop: Item | null;
        dropAdded: boolean;
    };
};

export type RankingEntry = {
    position: number;
    profileId: string;
    nick: string;
    level: number;
    currentUser: boolean;
};

export type PlayerRanking = {
    entries: RankingEntry[];
    currentPosition: number;
    activeSort: 'level';
};

export type AchievementEntry = {
    id: string;
    label: string;
    icon: string;
    value: number;
    target: number;
    percent: number;
    progressLabel: string;
    completed: boolean;
};

export type PlayerAchievements = {
    entries: AchievementEntry[];
    completedCount: number;
    totalCount: number;
    overallPercent: number;
};
