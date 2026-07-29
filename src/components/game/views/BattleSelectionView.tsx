'use client';

import type { DecoratedLocation, Stage } from '@/game/types';

/** Width of one stage frame inside the location's background strip. */
const STAGE_FRAME_WIDTH = 87;

type BattleSelectionViewProps = {
    location: DecoratedLocation;
    onSelectStage: (stage: Stage) => void;
    onBack: () => void;
};

export default function BattleSelectionView({
    location,
    onSelectStage,
    onBack,
}: BattleSelectionViewProps) {
    const stages = location.stages ?? [];

    return (
        <div className="inline-view battle-selection-inline">
            <div className="inline-header">{location.name || 'Wybór Walki'}</div>
            <div className="battle-selection-content">
                {stages.map((stage) => (
                    <div
                        key={stage.stage}
                        className={`battle-stage-card${stage.unlocked ? '' : ' locked'}`}
                        onClick={() => stage.unlocked && onSelectStage(stage)}
                    >
                        <div
                            className="stage-background"
                            style={{
                                backgroundImage: `url(${location.imageUrl})`,
                                backgroundPositionX: `${-(STAGE_FRAME_WIDTH * (stage.stage - 1))}px`,
                            }}
                        />
                        <div className="stage-content">
                            <span className="stage-number">{stage.stage}</span>
                            <span className="stage-label">Etap {stage.stage}</span>
                            <span className="stage-level">Poziom {stage.level}</span>
                            {!stage.unlocked && <span className="stage-lock">🔒</span>}
                        </div>
                    </div>
                ))}
            </div>
            <div className="inline-footer">
                <button className="btn-back" type="button" onClick={onBack}>
                    ← Powrót do mapy
                </button>
            </div>
        </div>
    );
}
