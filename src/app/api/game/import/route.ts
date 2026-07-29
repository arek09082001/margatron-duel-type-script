import { NextResponse } from 'next/server';

import { INVENTORY_SIZE } from '@/game/config';
import { recalculate } from '@/game/profile';
import { settleProfile } from '@/game/state';
import type { GameProfile } from '@/game/types';
import { getOrCreateProfile, loadProfile } from '@/server/profileService';
import { currentPlayer } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Guards against a malformed or hostile payload before it becomes a profile. */
function isPlausibleProfile(value: unknown): value is GameProfile {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const p = value as Partial<GameProfile>;

    return (
        typeof p.level === 'number' &&
        typeof p.exp === 'number' &&
        typeof p.gold === 'number' &&
        typeof p.vitality === 'number' &&
        Array.isArray(p.inventory) &&
        p.inventory.length <= INVENTORY_SIZE &&
        typeof p.equipped === 'object' &&
        p.equipped !== null
    );
}

/**
 * One-time migration of a character played before Supabase existed.
 *
 * Only accepted when the account has no profile yet, so it can never overwrite
 * real progress — and it is a deliberate trust decision: the payload comes
 * from the player's own localStorage. Every later change goes through the
 * authoritative action route.
 */
export async function POST(request: Request) {
    const player = await currentPlayer();

    if (!player) {
        return NextResponse.json({ message: 'Nie jesteś zalogowany.' }, { status: 401 });
    }

    const existing = await loadProfile(player.id);

    if (existing) {
        return NextResponse.json(
            { message: 'Ta postać ma już zapisany stan.', imported: false },
            { status: 409 },
        );
    }

    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ message: 'Nieprawidłowe żądanie.' }, { status: 400 });
    }

    if (!isPlausibleProfile(payload)) {
        return NextResponse.json({ message: 'Nieprawidłowe dane postaci.' }, { status: 400 });
    }

    try {
        const profile = await getOrCreateProfile(player, payload);
        const now = Date.now();

        settleProfile(profile, now);
        recalculate(profile);

        return NextResponse.json({ imported: true, profile });
    } catch (error) {
        console.error('[api/game/import] failed', error);

        return NextResponse.json({ message: 'Import nie powiódł się.' }, { status: 500 });
    }
}
