import { NextResponse } from 'next/server';

import { isGameError } from '@/game/errors';
import type { GameProfile } from '@/game/types';
import { RevisionConflictError, syncProfile } from '@/server/profileService';
import { isPlausibleProfile } from '@/server/profileValidation';
import { currentPlayer } from '@/server/session';

export const dynamic = 'force-dynamic';

/**
 * Persists the profile the browser computed.
 *
 * Battles resolve client-side so fighting is instant, which means this trusts
 * the payload — a deliberate trade for a single-player game. The revision
 * check is what still has to hold: it stops a stale tab from overwriting
 * progress made somewhere else.
 */
export async function PUT(request: Request) {
    const player = await currentPlayer();

    if (!player) {
        return NextResponse.json({ message: 'Nie jesteś zalogowany.' }, { status: 401 });
    }

    let body: { profile?: GameProfile; baseRevision?: string };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ message: 'Nieprawidłowe żądanie.' }, { status: 400 });
    }

    if (!isPlausibleProfile(body.profile) || typeof body.baseRevision !== 'string') {
        return NextResponse.json({ message: 'Nieprawidłowe dane postaci.' }, { status: 400 });
    }

    try {
        return NextResponse.json(await syncProfile(player, body.profile, body.baseRevision));
    } catch (error) {
        // 409 carries the winning state so the client can adopt it rather than
        // guess what it missed.
        if (error instanceof RevisionConflictError) {
            return NextResponse.json({ message: error.message, ...error.current }, { status: 409 });
        }

        if (isGameError(error)) {
            return NextResponse.json({ message: error.message }, { status: 422 });
        }

        console.error('[api/game/profile] sync failed', error);

        return NextResponse.json({ message: 'Nie udało się zapisać postępu.' }, { status: 500 });
    }
}
