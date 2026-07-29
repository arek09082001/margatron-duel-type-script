'use client';

import type { WorldMapPin } from '@/game/types';

type WorldMapViewProps = {
    worldMaps: WorldMapPin[];
    onSelect: (worldMap: WorldMapPin) => void;
    onBack: () => void;
};

export default function WorldMapView({ worldMaps, onSelect, onBack }: WorldMapViewProps) {
    return (
        <div className="inline-view world-map-inline">
            <div className="world-map-content">
                <div className="world-map-image" style={{ backgroundImage: "url('/game-assets/map.png')" }}>
                    {worldMaps.map((worldMap) => (
                        <div
                            key={worldMap.id}
                            className={`world-map-location${worldMap.locked ? ' locked' : ''}${worldMap.current ? ' current' : ''}`}
                            title={
                                worldMap.locked
                                    ? `${worldMap.name} (wymagany poziom ${worldMap.requiredLevel})`
                                    : worldMap.name
                            }
                            style={{ left: `${worldMap.x}%`, top: `${worldMap.y}%` }}
                            onClick={() => !worldMap.locked && onSelect(worldMap)}
                        >
                            <span className="world-map-number">{worldMap.id}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="inline-footer">
                <button className="btn-back" type="button" onClick={onBack}>
                    ← Powrót
                </button>
            </div>
        </div>
    );
}
