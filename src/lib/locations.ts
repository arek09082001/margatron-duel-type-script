import type { DecoratedLocation, GameLocation, LocationTypeValue, PlayerView } from '@/game/types';

const LOCATION_META: Record<LocationTypeValue, { icon: string; description: string }> = {
    battle: { icon: '⚔', description: 'Expowisko z pięcioma etapami walki.' },
    arena: { icon: '♜', description: 'Arena z losowymi przeciwnikami.' },
    toughenemy: { icon: 'X', description: 'Walka z mocnym przeciwnikiem.' },
    shop: { icon: '¤', description: 'Sklep z przedmiotami.' },
    rest: { icon: '⌛', description: 'Odpoczynek i regeneracja PA.' },
    worldmap: { icon: '◆', description: 'Przejście do mapy świata.' },
};

const ENTER_BUTTON_LABELS: Record<LocationTypeValue, string> = {
    battle: 'Walcz!',
    shop: 'Wejdź',
    rest: 'Odpocznij',
    worldmap: 'Otwórz mapę',
    arena: 'Wejdź na arenę',
    toughenemy: 'Rzuć wyzwanie',
};

export function decorateLocation(location: GameLocation, user: PlayerView): DecoratedLocation {
    const meta = LOCATION_META[location.type];

    return {
        ...location,
        icon: meta.icon,
        description: meta.description,
        // Only expowiska advertise a PA cost on the map card, as in the original.
        paCost: location.type === 'battle' ? (location.pa ?? 1) : 0,
        locked: Boolean(location.levelReq && user.level < location.levelReq),
    };
}

export function canEnterLocation(location: DecoratedLocation | null, user: PlayerView): boolean {
    if (!location || location.locked) {
        return false;
    }

    if (location.paCost > 0 && user.pa < location.paCost) {
        return false;
    }

    return !(location.levelReq && user.level < location.levelReq);
}

export function enterButtonLabel(location: DecoratedLocation, user: PlayerView): string {
    if (location.locked) {
        return 'Zablokowane';
    }

    if (location.paCost > 0 && user.pa < location.paCost) {
        return 'Brak PA';
    }

    if (location.levelReq && user.level < location.levelReq) {
        return `Wymagany poziom ${location.levelReq}`;
    }

    return ENTER_BUTTON_LABELS[location.type] ?? 'Wejdź';
}
