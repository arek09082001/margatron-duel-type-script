import { NextResponse } from 'next/server';

import { recalculate } from '@/game/profile';
import { settleProfile } from '@/game/state';
import { getOrCreateProfile, loadProfile } from '@/server/profileService';
import { isPlausibleProfile } from '@/server/profileValidation';
import { currentPlayer } from '@/server/session';

export const dynamic = 'force-dynamic';

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
