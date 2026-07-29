'use client';

import type { DecoratedLocation, GameMapData, PlayerView } from '@/game/types';
import { canEnterLocation, decorateLocation, enterButtonLabel } from '@/lib/locations';

const TILE = 32;

type MapViewProps = {
    map: GameMapData;
    user: PlayerView;
    selectedLocation: DecoratedLocation | null;
    onSelectLocation: (location: DecoratedLocation) => void;
    onEnterLocation: () => void;
};

export default function MapView({
    map,
    user,
    selectedLocation,
    onSelectLocation,
    onEnterLocation,
}: MapViewProps) {
    const locations = map.locations.map((location) => decorateLocation(location, user));

    return (
        <div className="view-map">
            <div className="map-container">
                <div className="map-image" style={{ backgroundImage: `url(${map.imageUrl})` }}>
                    <div className="map-name-label">{map.name}</div>

                    {map.npcs.map((npc) => (
                        <div
                            key={npc.id}
                            className="map-npc"
                            title={npc.name}
                            style={{
                                position: 'absolute',
                                left: `${npc.x * TILE}px`,
                                top: `${npc.y * TILE}px`,
                                backgroundImage: `url(${npc.imageUrl})`,
                                width: `${npc.width}px`,
                                height: `${npc.height}px`,
                            }}
                        />
                    ))}

                    {locations.map((location) => (
                        <div
                            key={location.id}
                            className={`map-location ${location.type}${location.locked ? ' locked' : ''}`}
                            style={{
                                left: `${location.x * TILE}px`,
                                top: `${location.y * TILE}px`,
                                width: `${location.width * TILE}px`,
                                height: `${location.height * TILE}px`,
                            }}
                            onClick={() => !location.locked && onSelectLocation(location)}
                        >
                            <div className="location-text">
                                <span className="location-name">{location.name}</span>
                                {location.levelMin !== undefined && location.levelMax !== undefined && (
                                    <span className="location-level">
                                        Poziom {location.levelMin}-{location.levelMax}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedLocation && (
                <div className="location-info">
                    <h3>{selectedLocation.name}</h3>
                    <p>{selectedLocation.description}</p>
                    <div className="location-details">
                        {selectedLocation.paCost > 0 && <span>Koszt: {selectedLocation.paCost} PA</span>}
                        {selectedLocation.levelReq && (
                            <span>Wymagany poziom: {selectedLocation.levelReq}</span>
                        )}
                        {selectedLocation.levelMin !== undefined && selectedLocation.levelMax !== undefined && (
                            <span>
                                Poziom przeciwników: {selectedLocation.levelMin}-{selectedLocation.levelMax}
                            </span>
                        )}
                    </div>
                    <button
                        className="btn-enter"
                        type="button"
                        disabled={!canEnterLocation(selectedLocation, user)}
                        onClick={onEnterLocation}
                    >
                        {enterButtonLabel(selectedLocation, user)}
                    </button>
                </div>
            )}
        </div>
    );
}
