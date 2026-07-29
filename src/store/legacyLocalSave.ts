'use client';

/**
 * Reads a character saved by the pre-Supabase build.
 *
 * That version kept everything under one localStorage key: a list of local
 * accounts plus their profiles. On the first login after the migration we hand
 * the active profile to `/api/game/import` so nobody loses their progress, then
 * drop the key.
 */

import type { GameProfile } from '@/game/types';

/** The key the local-only build persisted its Zustand state under. */
const LEGACY_KEY = 'mgduel:v1';

type LegacyState = {
    state?: {
        currentAccountId?: string | null;
        profiles?: Record<string, GameProfile>;
    };
};

export function readLegacyLocalProfile(): GameProfile | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(LEGACY_KEY);

        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as LegacyState;
        const profiles = parsed.state?.profiles ?? {};
        const activeId = parsed.state?.currentAccountId ?? null;

        // Prefer the account that was signed in; otherwise take the furthest
        // progressed character, which is the one worth keeping.
        const candidates = Object.values(profiles).filter(
            (profile): profile is GameProfile => Boolean(profile) && typeof profile.level === 'number',
        );

        if (candidates.length === 0) {
            return null;
        }

        if (activeId && profiles[activeId]) {
            return profiles[activeId];
        }

        return candidates.sort((left, right) => right.level - left.level || right.exp - left.exp)[0];
    } catch {
        return null;
    }
}

export function clearLegacyLocalProfile(): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.removeItem(LEGACY_KEY);
    } catch {
        // Private mode or a full quota — harmless, the import is idempotent.
    }
}
