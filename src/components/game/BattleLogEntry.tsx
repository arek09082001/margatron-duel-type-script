'use client';

import type { BattleLog } from '@/game/types';

const ENTRY_CLASSES: Partial<Record<BattleLog['type'], string>> = {
    'battle-start': 'info',
    stun: 'info',
    'level-up': 'levelup',
    'attribute-points': 'info',
};

const PLAYER_ICON = '/game-assets/items/miecz05_pol.gif';
const ENEMY_ICON = '/game-assets/items/tar_tarcza09.gif';

export default function BattleLogEntry({ log }: { log: BattleLog }) {
    const entryClass = log.type === 'attack' ? `${log.actor}-attack` : (ENTRY_CLASSES[log.type] ?? log.type);
    const icon = log.type === 'attack' ? (log.actor === 'player' ? PLAYER_ICON : ENEMY_ICON) : null;

    return (
        <div
            className={`log-entry ${entryClass}`}
            style={log.type === 'drop' ? { color: log.color } : undefined}
        >
            {icon && <img src={icon} alt="" />}

            <span className="log-text">
                {log.type === 'battle-start' && <>Walka z {log.enemyName} została rozpoczęta!</>}

                {log.type === 'attack' && log.actor === 'player' && (
                    <>
                        <b className="player-attack">Zadałeś</b> przeciwnikowi {log.damage} obrażeń.{' '}
                        <b className="enemy-attack">{log.targetName}</b> otrzymał {log.damage} obrażeń,{' '}
                        {log.remainingHp} PŻ pozostało.
                        {log.critical && <> KRYTYK!</>}
                    </>
                )}

                {log.type === 'attack' && log.actor === 'enemy' && (
                    <>
                        <b className="enemy-attack">{log.actorName}</b> uderzył z siłą {log.attackPower} obrażeń.
                        Obecny pancerz: {log.armor}. <b className="player-attack">Otrzymałeś</b> {log.damage}{' '}
                        obrażeń, {log.remainingHp} PŻ pozostało.
                    </>
                )}

                {log.type === 'dodge' && <>Unikasz ataku przeciwnika {log.attackerName}!</>}

                {log.type === 'stun' && <>Ogłuszasz przeciwnika {log.targetName} — traci turę!</>}

                {log.type === 'reward' && <>Doświadczenie: {log.amount}p</>}

                {log.type === 'level-up' && <>Awansujesz na poziom {log.level}!</>}

                {log.type === 'attribute-points' && (
                    <>
                        +{log.levelsGained} poziom, +{log.points} punkty atrybutów
                    </>
                )}

                {log.type === 'drop' && <>Zdobyto: {log.itemName}!</>}

                {log.type === 'defeat' && <>Zostałeś pokonany!</>}
            </span>
        </div>
    );
}
