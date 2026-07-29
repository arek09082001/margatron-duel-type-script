'use client';

import { useEffect, useRef } from 'react';

import type { BattleResult, DecoratedLocation } from '@/game/types';
import { itemImage } from '@/lib/format';
import BattleLogEntry from '../BattleLogEntry';

type BattleViewProps = {
    battle: BattleResult;
    location: DecoratedLocation | null;
    /** Remaining fights in the current expedition, or null outside expowiska. */
    remainingFights: number | null;
    canContinue: boolean;
    onContinue: () => void;
    onClose: () => void;
};

export default function BattleView({
    battle,
    location,
    remainingFights,
    canContinue,
    onContinue,
    onClose,
}: BattleViewProps) {
    const logRef = useRef<HTMLDivElement>(null);
    const drop = battle.rewards.drop;
    const expeditionOver = remainingFights !== null && remainingFights <= 0;

    // Keep the newest log line in view when a new battle is rendered.
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [battle]);

    return (
        <div className="inline-view battle-inline">
            <div className="inline-header">{battle.name}</div>
            <div className="battle-main-layout">
                <div className="battle-log-container">
                    <div ref={logRef} className="battle-log-scroll">
                        {battle.log.map((log, index) => (
                            <BattleLogEntry key={index} log={log} />
                        ))}
                    </div>
                </div>

                <div className="battle-visuals" style={{ backgroundImage: `url(${location?.imageUrl ?? ''})` }}>
                    {expeditionOver ? (
                        <div className="battle-info">Wyprawa zakończona</div>
                    ) : (
                        <div className="enemy-container">
                            {battle.enemy.imageUrl && (
                                <img
                                    src={battle.enemy.imageUrl}
                                    alt={battle.enemy.name}
                                    className="enemy-image-pixel"
                                />
                            )}
                        </div>
                    )}

                    {drop && (
                        <div className="battle-drop">
                            <div className={`drop-item ${drop.rarityCss}`.trim()}>
                                <img src={itemImage(drop)} alt={drop.name} className="drop-image" />
                                <span className="drop-name" style={{ color: drop.rarityColor }}>
                                    {drop.name}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="battle-footer">
                        <div className="battle-end-message">
                            {battle.won ? (
                                <span className="win">Walka wygrana!</span>
                            ) : (
                                <span className="lose">Walka przegrana</span>
                            )}
                        </div>
                        <div className="battle-buttons">
                            {canContinue && (
                                <button
                                    className="btn-battle-action btn-next"
                                    type="button"
                                    onClick={onContinue}
                                >
                                    Idź dalej ➜
                                </button>
                            )}
                            <button className="btn-battle-action" type="button" onClick={onClose}>
                                Wróć do mapy
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
