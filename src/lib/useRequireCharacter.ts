'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useCurrentProfile, useHydrated } from '@/store/hooks';

/**
 * Sends the player back to the login screen when no character is active.
 * Waits for hydration first, otherwise the very first client render (before
 * localStorage is read) would always look logged out.
 */
export function useRequireCharacter(): { ready: boolean } {
    const router = useRouter();
    const hydrated = useHydrated();
    const profile = useCurrentProfile();

    useEffect(() => {
        if (hydrated && !profile) {
            router.replace('/');
        }
    }, [hydrated, profile, router]);

    return { ready: hydrated && profile !== null };
}
