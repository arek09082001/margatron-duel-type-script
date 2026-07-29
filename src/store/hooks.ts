'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { achievementsFor } from '@/game/achievements';
import { levelRanking } from '@/game/ranking';
import { buildSnapshot } from '@/game/state';
import type { GameProfile, GameSnapshot, PlayerAchievements, PlayerRanking } from '@/game/types';
import { useGameStore } from './gameStore';

/**
 * True once the persisted store has been read from localStorage. Screens must
 * wait for this before rendering player data, otherwise the server-rendered
 * markup (empty store) and the first client render disagree.
 */
export function useHydrated(): boolean {
    return useGameStore((state) => state.hydrated);
}

export function useCurrentProfile(): GameProfile | null {
    return useGameStore((state) =>
        state.currentAccountId ? (state.profiles[state.currentAccountId] ?? null) : null,
    );
}

/**
 * Derived read model. Recomputed only when the profile object identity changes,
 * which happens exactly once per applied action or clock tick.
 */
export function useSnapshot(): GameSnapshot | null {
    const profile = useCurrentProfile();

    return useMemo(() => (profile ? buildSnapshot(profile) : null), [profile]);
}

export function useAchievements(): PlayerAchievements | null {
    const profile = useCurrentProfile();

    return useMemo(() => (profile ? achievementsFor(profile) : null), [profile]);
}

export function useRanking(): PlayerRanking | null {
    const profiles = useGameStore((state) => state.profiles);
    const currentAccountId = useGameStore((state) => state.currentAccountId);

    return useMemo(
        () => (currentAccountId ? levelRanking(Object.values(profiles), currentAccountId) : null),
        [profiles, currentAccountId],
    );
}

/**
 * Drives action-point regeneration and rest completion.
 *
 * Replaces the Reverb websocket + queue workers: the store settles itself from
 * timestamps, so one interval is enough. Also re-settles when the tab regains
 * focus, since background timers get throttled hard.
 */
export function useGameClock(intervalMs = 1000): void {
    const tick = useGameStore((state) => state.tick);

    useEffect(() => {
        tick();

        const timer = window.setInterval(tick, intervalMs);
        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                tick();
            }
        };

        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', tick);

        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', tick);
        };
    }, [tick, intervalMs]);
}

/** A ticking clock for countdown labels. Returns epoch milliseconds. */
export function useNow(intervalMs = 1000): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), intervalMs);

        return () => window.clearInterval(timer);
    }, [intervalMs]);

    return now;
}

/** Flashes for `durationMs` whenever `value` increases. */
export function useIncreaseFlash(value: number, durationMs = 900): boolean {
    const [flashing, setFlashing] = useState(false);
    const previous = useRef(value);

    useEffect(() => {
        if (value <= previous.current) {
            previous.current = value;

            return;
        }

        previous.current = value;
        setFlashing(true);

        const timer = window.setTimeout(() => setFlashing(false), durationMs);

        return () => window.clearTimeout(timer);
    }, [value, durationMs]);

    return flashing;
}
