'use client';

import type { DecoratedLocation, GameMapData, ToughEnemyKind } from '@/game/types';



type ToughEnemyViewProps = {
    map: GameMapData;
    location: DecoratedLocation | null;
    onFight: (enemyType: ToughEnemyKind) => void;
    onBack: () => void;
};

export default function ToughEnemyView({ map, location, onFight, onBack }: ToughEnemyViewProps) {
    // Not every map defines all three tiers — Wielgrad has no hero, Czarnobór no
    // elite, and no map has an elite 2 except Czarnobór. Those buttons used to
    // look active and then fail with an error, so they are disabled instead.
    const available: Record<ToughEnemyKind, boolean> = {
        elite: Object.keys(map.eliteEnemies).length > 0,
        elite2: Object.keys(map.elite2Enemies).length > 0,
        hero: Object.keys(map.heroEnemies).length > 0,
    };

    const UNAVAILABLE = 'Niedostępne na tej mapie';

    return (
        <div className="inline-view arena-inline">
            <div className="inline-header">Mocny przeciwnik</div>
            <div className="arena-main-layout">
                <div className="arena-left-panel">
                    <div className="arena-info-text">
                        <h3>Witaj!</h3>
                        <p>Tutaj możesz zmierzyć się z silnym przeciwnikiem.</p>
                    </div>
                </div>
                <div
                    className="arena-right-panel"
                    style={{ backgroundImage: `url(${location?.imageUrl ?? ''})` }}
                >
                    <div className="arena-buttons-container">
                        <button
                            className="arena-difficulty-btn easy"
                            type="button"
                            disabled={!available.elite}
                            onClick={() => onFight('elite')}
                        >
                            <span className="difficulty-name">Walka z elitą</span>
                            <span className="difficulty-desc">
                                {available.elite ? `Poziom ${map.levelRange.min}` : UNAVAILABLE}
                            </span>
                        </button>
                        <button
                            className="arena-difficulty-btn medium"
                            type="button"
                            disabled={!available.elite2}
                            onClick={() => onFight('elite2')}
                        >
                            <span className="difficulty-name">Walka z elitą 2</span>
                            <span className="difficulty-desc">
                                {available.elite2 ? `Poziom ${map.levelRange.min + 5}` : UNAVAILABLE}
                            </span>
                        </button>
                        <button
                            className="arena-difficulty-btn hard"
                            type="button"
                            disabled={!available.hero}
                            onClick={() => onFight('hero')}
                        >
                            <span className="difficulty-name">Walka z herosem</span>
                            <span className="difficulty-desc">
                                {available.hero ? `Poziom ${map.levelRange.max}` : UNAVAILABLE}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            <div className="inline-footer">
                <button className="btn-back" type="button" onClick={onBack}>
                    ← Wyjdź
                </button>
            </div>
        </div>
    );
}
