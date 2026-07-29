'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useGameStore } from '@/store/gameStore';
import { useCurrentProfile, useLoaded } from '@/store/hooks';

/**
 * Loads the signed-in player's character, and sends them to the login screen
 * when there is no session.
 *
 * The load is fired once per mount; `loaded` gates rendering so the game never
 * flashes a logged-out state while the request is in flight.
 */
export function useRequireCharacter(): { ready: boolean } {
    const router = useRouter();
    const loaded = useLoaded();
    const profile = useCurrentProfile();
    const load = useGameStore((state) => state.load);
    const requested = useRef(false);

    useEffect(() => {
        if (requested.current) {
            return;
        }

        requested.current = true;
        void load().catch(() => {
            // Falls through to the redirect below when there is no session.
        });
    }, [load]);

    useEffect(() => {
        if (loaded && !profile) {
            router.replace('/');
        }
    }, [loaded, profile, router]);

    return { ready: loaded && profile !== null };
}
