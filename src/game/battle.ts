/**
 * Port of `app/Game/Services/BattleService.php` — the auto-battle loop plus the
 * three battle entry points (stage, arena, tough enemy).
 */

import { arenaPaCost, getLocation, getMap, scaledEnemy, stagesForLocation } from './catalog';
import { MAX_BATTLE_TURNS, STAGES_PER_LOCATION } from './config';
import { ARENA_DIFFICULTY_META } from './enums';
import { GameError } from './errors';
import { addItem } from './inventory';
import { rollForDrop } from './items';
import { addExperience, recalculate, spendPa } from './profile';
import { percentRoll, pick, randomInt } from './rng';
import { unlockNextStage, unlockedStage } from './state';
import type {
    ArenaDifficultyValue,
    BattleLog,
    BattleResult,
    EnemyGroup,
    GameProfile,
    Item,
    ScaledEnemy,
    ToughEnemyKind,
} from './types';

export function fightStage(
    profile: GameProfile,
    locationId: string,
    stage: number,
    now: number = Date.now(),
): BattleResult {
    const map = getMap(profile.currentMapId);
    const location = getLocation(map.id, locationId);

    if (!location || location.type !== 'battle') {
        throw new GameError('Nie znaleziono expowiska.');
    }

    if (profile.level < (location.levelReq ?? 1)) {
        throw new GameError('Masz za niski poziom na tę lokację.');
    }

    const unlocked = unlockedStage(profile, map.id, locationId);

    if (stage > unlocked || stage < 1 || stage > STAGES_PER_LOCATION) {
        throw new GameError('Ten etap nie jest jeszcze odblokowany.');
    }

    spendPa(profile, location.pa ?? 1, now);

    const stageData = stagesForLocation(location, unlocked).find(
        (candidate) => candidate.stage === stage,
    )!;
    const enemyKey = pick(location.enemies ?? []);
    const enemy = scaledEnemy(map.id, enemyKey, stageData.level, 'enemies');
    const result = runAutoBattle(profile, enemy, `${location.name} - Etap ${stage}`, null);

    if (result.won) {
        applyVictory(profile, enemy, result, null, now);
        unlockNextStage(profile, map.id, locationId, stage);
    }

    return result;
}

export function fightArena(
    profile: GameProfile,
    difficulty: ArenaDifficultyValue,
    now: number = Date.now(),
): BattleResult {
    const map = getMap(profile.currentMapId);

    spendPa(profile, arenaPaCost(difficulty), now);

    const enemyKeys = map.arenaEnemies[difficulty] ?? [];

    if (enemyKeys.length === 0) {
        throw new GameError('Arena na tej mapie jest niedostępna.');
    }

    const meta = ARENA_DIFFICULTY_META[difficulty];
    const enemy = scaledEnemy(map.id, pick(enemyKeys), map.levelRange.min + meta.levelBonus, 'enemies');
    const result = runAutoBattle(profile, enemy, `Arena - ${meta.label} Walka`, difficulty);

    if (result.won) {
        applyVictory(profile, enemy, result, difficulty, now);
    }

    return result;
}

const TOUGH_ENEMY_GROUPS: Record<ToughEnemyKind, EnemyGroup> = {
    elite: 'eliteEnemies',
    elite2: 'elite2Enemies',
    hero: 'heroEnemies',
};

const TOUGH_ENEMY_DIFFICULTY: Record<ToughEnemyKind, ArenaDifficultyValue> = {
    elite: 'easy',
    elite2: 'medium',
    hero: 'hard',
};

export function fightToughEnemy(
    profile: GameProfile,
    locationId: string,
    enemyType: ToughEnemyKind,
    now: number = Date.now(),
): BattleResult {
    const map = getMap(profile.currentMapId);
    const location = getLocation(map.id, locationId);

    if (!location || location.type !== 'toughenemy') {
        throw new GameError('Nie znaleziono przeciwnika.');
    }

    spendPa(profile, location.pa ?? 1, now);

    const group = TOUGH_ENEMY_GROUPS[enemyType];
    const difficulty = TOUGH_ENEMY_DIFFICULTY[enemyType];
    const level =
        enemyType === 'elite'
            ? map.levelRange.min
            : enemyType === 'elite2'
              ? map.levelRange.min + 5
              : map.levelRange.max;

    const enemyKeys = Object.keys(map[group]);

    if (enemyKeys.length === 0) {
        throw new GameError('Walka z przeciwnikiem na tej mapie jest niedostępna.');
    }

    const enemy = scaledEnemy(map.id, pick(enemyKeys), level, group);
    const result = runAutoBattle(profile, enemy, 'Walka z silnym przeciwnikiem', null);

    if (result.won) {
        applyVictory(profile, enemy, result, difficulty, now);
    }

    return result;
}

/** Player always strikes first; the fight is capped so it can never hang. */
function runAutoBattle(
    profile: GameProfile,
    enemy: ScaledEnemy,
    name: string,
    arenaDifficulty: ArenaDifficultyValue | null,
): BattleResult {
    recalculate(profile);

    let playerHp = Math.max(1, profile.hp);
    let enemyHp = enemy.hp;
    const log: BattleLog[] = [{ type: 'battle-start', enemyName: enemy.name }];

    for (let turn = 1; turn <= MAX_BATTLE_TURNS; turn++) {
        const playerDmg = randomInt(profile.dmgMin, Math.max(profile.dmgMin, profile.dmgMax));
        const isCrit = percentRoll() < profile.critChance;
        const finalDmg = isCrit ? Math.floor(playerDmg * (profile.critPower / 100)) : playerDmg;

        enemyHp = Math.max(0, enemyHp - finalDmg);
        log.push({
            type: 'attack',
            actor: 'player',
            target: 'enemy',
            targetName: enemy.name,
            attackPower: playerDmg,
            damage: finalDmg,
            remainingHp: enemyHp,
            critical: isCrit,
        });

        if (enemyHp <= 0) {
            return buildResult(name, enemy, true, playerHp, enemyHp, log, arenaDifficulty);
        }

        // Ogłuszenie: the hit rattles the enemy and it loses its turn.
        //
        // The stat was rolled on gear, summed by `recalculate`, printed in the
        // sidebar and even had an achievement — and no fight ever read it. Items
        // were advertising a stat that did nothing, which also made every shape
        // that rolls towards it (młot, maczuga, kiścień) quietly worse than its
        // neighbours. It is capped at 40% like unik, so at most it takes two
        // turns in five.
        if (percentRoll() < profile.stun) {
            log.push({ type: 'stun', actor: 'player', target: 'enemy', targetName: enemy.name });

            continue;
        }

        const enemyDmg = randomInt(enemy.dmgMin, Math.max(enemy.dmgMin, enemy.dmgMax));

        if (percentRoll() < profile.dodge) {
            log.push({
                type: 'dodge',
                actor: 'player',
                attacker: 'enemy',
                attackerName: enemy.name,
            });
        } else {
            const reducedDmg = Math.max(0, enemyDmg - Math.floor(profile.armor));
            playerHp = Math.max(0, playerHp - reducedDmg);
            log.push({
                type: 'attack',
                actor: 'enemy',
                actorName: enemy.name,
                target: 'player',
                attackPower: enemyDmg,
                armor: Math.floor(profile.armor),
                damage: reducedDmg,
                remainingHp: playerHp,
                critical: false,
            });
        }

        if (playerHp <= 0) {
            return buildResult(name, enemy, false, playerHp, enemyHp, log, arenaDifficulty);
        }
    }

    return buildResult(name, enemy, false, playerHp, enemyHp, log, arenaDifficulty);
}

function buildResult(
    name: string,
    enemy: ScaledEnemy,
    won: boolean,
    playerHp: number,
    enemyHp: number,
    log: BattleLog[],
    arenaDifficulty: ArenaDifficultyValue | null,
): BattleResult {
    if (!won) {
        log.push({ type: 'defeat' });
    }

    return {
        name,
        enemy,
        won,
        playerHp,
        enemyHp,
        arenaDifficulty,
        log,
        rewards: {
            exp: won ? enemy.exp : 0,
            gold: won ? enemy.gold : 0,
            level: null,
            drop: null,
            dropAdded: false,
        },
    };
}

function applyVictory(
    profile: GameProfile,
    enemy: ScaledEnemy,
    result: BattleResult,
    arenaDifficulty: ArenaDifficultyValue | null,
    now: number,
): void {
    profile.gold += enemy.gold;
    profile.monstersKilled += 1;

    const levelResult = addExperience(profile, enemy.exp, now);
    const drop = rollForDrop(enemy.level, profile.luck, arenaDifficulty);
    const dropAdded = drop ? addItem(profile, drop) : false;

    if (dropAdded && drop) {
        recordItemFound(profile, drop);
    }

    result.rewards.level = levelResult;
    result.rewards.drop = drop;
    result.rewards.dropAdded = dropAdded;
    result.log.push({ type: 'reward', rewardType: 'experience', amount: enemy.exp });

    if (levelResult.leveledUp) {
        result.log.push({ type: 'level-up', level: levelResult.newLevel });
        result.log.push({
            type: 'attribute-points',
            levelsGained: levelResult.levelsGained,
            points: levelResult.levelsGained * 2,
        });
    }

    if (drop) {
        result.log.push({ type: 'drop', itemName: drop.name, color: drop.rarityColor });
    }
}

function recordItemFound(profile: GameProfile, item: Item): void {
    switch (item.rarity) {
        case 'unique':
            profile.uniqueItemsFound += 1;
            break;
        case 'heroic':
            profile.heroicItemsFound += 1;
            break;
        case 'legendary':
            profile.legendaryItemsFound += 1;
            break;
        default:
            break;
    }
}
