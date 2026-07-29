'use client';

import type { DecoratedLocation, GameMapData, ToughEnemyKind } from '@/game/types';

type ToughEnemyViewProps = {
    map: GameMapData;
    location: DecoratedLocation | null;
    onFight: (enemyType: ToughEnemyKind) => void;
    onBack: () => void;
};

export default function ToughEnemyView({ map, location, onFight, onBack }: ToughEnemyViewProps) {
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
                        <button className="arena-difficulty-btn easy" type="button" onClick={() => onFight('elite')}>
                            <span className="difficulty-name">Walka z elitą</span>
                            <span className="difficulty-desc">Poziom {map.levelRange.min}</span>
                        </button>
                        <button
                            className="arena-difficulty-btn medium"
                            type="button"
                            onClick={() => onFight('elite2')}
                        >
                            <span className="difficulty-name">Walka z elitą 2</span>
                            <span className="difficulty-desc">Poziom {map.levelRange.min + 5}</span>
                        </button>
                        <button className="arena-difficulty-btn hard" type="button" onClick={() => onFight('hero')}>
                            <span className="difficulty-name">Walka z herosem</span>
                            <span className="difficulty-desc">Poziom {map.levelRange.max}</span>
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
