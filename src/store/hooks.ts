'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { achievementsFor } from '@/game/achievements';
import { buildSnapshot } from '@/game/state';
import type { GameProfile, GameSnapshot, PlayerAchievements, PlayerRanking } from '@/game/types';
import { useGameStore } from './gameStore';

/** True once `/api/game` has answered, so screens do not flash a logged-out state. */
export function useLoaded(): boolean {
    return useGameStore((state) => state.loaded);
}

export function useCurrentProfile(): GameProfile | null {
    return useGameStore((state) => state.profile);
}

/**
 * Derived read model, recomputed only when the profile object identity changes
 * — once per applied action or clock tick.
 */
export function useSnapshot(): GameSnapshot | null {
    const profile = useCurrentProfile();

    return useMemo(() => (profile ? buildSnapshot(profile) : null), [profile]);
}

export function useAchievements(): PlayerAchievements | null {
    const profile = useCurrentProfile();

    return useMemo(() => (profile ? achievementsFor(profile) : null), [profile]);
}

/** The global ranking, as computed server-side across every player. */
export function useRanking(): PlayerRanking | null {
    return useGameStore((state) => state.ranking);
}

/**
 * Loads the profile once per mount, then drives local action-point ticking.
 *
 * The server settles authoritatively on every action; this only keeps the
 * displayed counter moving in between, and re-syncs when the tab regains focus
 * (another device may have spent PA in the meantime).
 */
export function useGameClock(intervalMs = 1000): void {
    const tick = useGameStore((state) => state.tick);
    const load = useGameStore((state) => state.load);
    const flush = useGameStore((state) => state.flush);

    useEffect(() => {
        const timer = window.setInterval(tick, intervalMs);

        // Coming back to the tab: send anything still queued *before* pulling
        // the server's state, or the reload would discard those actions.
        const resync = async () => {
            if (document.visibilityState !== 'visible') {
                return;
            }

            try {
                await flush();
                await load();
            } catch {
                // A failed background re-sync is not worth interrupting play.
            }
        };

        // Leaving the tab or the page: don't strand queued progress.
        const persist = () => {
            if (document.visibilityState === 'hidden') {
                void flush().catch(() => {
                    // Reported through the store's lastError; nothing to do here.
                });
            }
        };

        const onVisibility = () => {
            void (document.visibilityState === 'visible' ? resync() : persist());
        };

        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('focus', () => void resync());
        window.addEventListener('pagehide', () => void flush().catch(() => {}));

        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [tick, load, flush, intervalMs]);
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

/**
 * Flashes for `durationMs` whenever `value` increases.
 *
 * Pass `null` while the value is still unknown (e.g. before the first load), so
 * the first real reading seeds the baseline instead of registering as a jump.
 */
export function useIncreaseFlash(value: number | null, durationMs = 900): boolean {
    const [flashing, setFlashing] = useState(false);
    const previous = useRef<number | null>(null);

    useEffect(() => {
        if (value === null) {
            return;
        }

        const wasSeeded = previous.current !== null;
        const increased = wasSeeded && value > previous.current!;

        previous.current = value;

        if (!increased) {
            return;
        }

        setFlashing(true);

        const timer = window.setTimeout(() => setFlashing(false), durationMs);

        return () => window.clearTimeout(timer);
    }, [value, durationMs]);

    return flashing;
}
