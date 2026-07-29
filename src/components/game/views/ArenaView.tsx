'use client';

import type { ArenaDifficultyValue, DecoratedLocation, GameMapData } from '@/game/types';

type ArenaViewProps = {
    map: GameMapData;
    location: DecoratedLocation | null;
    onFight: (difficulty: ArenaDifficultyValue) => void;
    onBack: () => void;
};

export default function ArenaView({ map, location, onFight, onBack }: ArenaViewProps) {
    return (
        <div className="inline-view arena-inline">
            <div className="inline-header">Arena</div>
            <div className="arena-main-layout">
                <div className="arena-left-panel">
                    <div className="arena-info-text">
                        <h3>Witaj na Arenie!</h3>
                        <p>Tutaj możesz zmierzyć się z losowymi przeciwnikami o różnej sile.</p>
                        <p className="arena-tip">Im trudniejsza walka, tym większa szansa na lepszą nagrodę.</p>
                    </div>
                </div>
                <div
                    className="arena-right-panel"
                    style={{ backgroundImage: `url(${location?.imageUrl ?? ''})` }}
                >
                    <div className="arena-buttons-container">
                        <button className="arena-difficulty-btn easy" type="button" onClick={() => onFight('easy')}>
                            <span className="difficulty-name">Łatwa walka</span>
                            <span className="difficulty-desc">Poziom {map.levelRange.min}</span>
                        </button>
                        <button
                            className="arena-difficulty-btn medium"
                            type="button"
                            onClick={() => onFight('medium')}
                        >
                            <span className="difficulty-name">Średnia walka</span>
                            <span className="difficulty-desc">Poziom {map.levelRange.min + 3}</span>
                        </button>
                        <button className="arena-difficulty-btn hard" type="button" onClick={() => onFight('hard')}>
                            <span className="difficulty-name">Trudna walka</span>
                            <span className="difficulty-desc">Poziom {map.levelRange.min + 6}</span>
                        </button>
                    </div>
                </div>
            </div>
            <div className="inline-footer">
                <button className="btn-back" type="button" onClick={onBack}>
                    ← Wyjdź z areny
                </button>
            </div>
        </div>
    );
}
