/**
 * The player actions the client can ask for, and how to apply one.
 *
 * Shared by the browser and the API route so both run *the same* code: the
 * client applies deterministic actions optimistically for an instant UI, the
 * server replays them authoritatively and its result wins.
 */

import { fightArena, fightStage, fightToughEnemy } from './battle';
import { buyItem, consumeItem, equip, sell, sellAll, unequip } from './inventory';
import { addAttribute } from './profile';
import { instantRest, startRest } from './rest';
import { buyPa, selectMap } from './state';
import type {
    ArenaDifficultyValue,
    BattleResult,
    EquipmentSlot,
    GameProfile,
    PlayerAttributeKey,
    ToughEnemyKind,
} from './types';

export type GameAction =
    | { type: 'addAttribute'; attribute: PlayerAttributeKey }
    | { type: 'selectMap'; mapId: number }
    | { type: 'rest'; minutes: number }
    | { type: 'instantRest' }
    | { type: 'buyPa'; amount: number }
    | { type: 'buyItem'; shopId: string; itemId: string | number }
    | { type: 'equipItem'; index: number }
    | { type: 'unequipItem'; slot: EquipmentSlot }
    | { type: 'sellItem'; index: number }
    | { type: 'sellAllItems' }
    | { type: 'usePotion'; index: number }
    | { type: 'fightStage'; locationId: string; stage: number }
    | { type: 'fightArena'; difficulty: ArenaDifficultyValue }
    | { type: 'fightTough'; locationId: string; enemyType: ToughEnemyKind };

export type GameActionType = GameAction['type'];

/**
 * Battles roll dice, so a client simulation would disagree with the server's —
 * different damage, different drops. Only the actions below are reproducible
 * from the same profile, and only those may be applied optimistically.
 *
 * `buyItem` qualifies despite minting a random item id: the id is cosmetic,
 * items are addressed by slot index, and the server's copy replaces it on the
 * next reconcile.
 */
const DETERMINISTIC: ReadonlySet<GameActionType> = new Set<GameActionType>([
    'addAttribute',
    'selectMap',
    'rest',
    'instantRest',
    'buyPa',
    'buyItem',
    'equipItem',
    'unequipItem',
    'sellItem',
    'sellAllItems',
    'usePotion',
]);

export function isDeterministic(action: GameAction): boolean {
    return DETERMINISTIC.has(action.type);
}

/** Applies one action in place. Throws `GameError` when a rule forbids it. */
export function applyGameAction(
    profile: GameProfile,
    action: GameAction,
    now: number,
): BattleResult | undefined {
    switch (action.type) {
        case 'addAttribute':
            addAttribute(profile, action.attribute);
            return;
        case 'selectMap':
            selectMap(profile, action.mapId);
            return;
        case 'rest':
            startRest(profile, action.minutes, now);
            return;
        case 'instantRest':
            instantRest(profile, now);
            return;
        case 'buyPa':
            buyPa(profile, action.amount, now);
            return;
        case 'buyItem':
            buyItem(profile, action.shopId, action.itemId);
            return;
        case 'equipItem':
            equip(profile, action.index);
            return;
        case 'unequipItem':
            unequip(profile, action.slot);
            return;
        case 'sellItem':
            sell(profile, action.index);
            return;
        case 'sellAllItems':
            sellAll(profile);
            return;
        case 'usePotion':
            consumeItem(profile, action.index, now);
            return;
        case 'fightStage':
            return fightStage(profile, action.locationId, action.stage, now);
        case 'fightArena':
            return fightArena(profile, action.difficulty, now);
        case 'fightTough':
            return fightToughEnemy(profile, action.locationId, action.enemyType, now);
    }
}
