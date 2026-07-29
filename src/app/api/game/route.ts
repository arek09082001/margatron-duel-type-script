import { NextResponse } from 'next/server';

import { errorMessage, isGameError } from '@/game/errors';
import { currentProfile, globalRanking } from '@/server/profileService';
import { currentPlayer } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Initial load: the player's profile plus the global ranking. */
export async function GET() {
    const player = await currentPlayer();

    if (!player) {
        return NextResponse.json({ message: 'Nie jesteś zalogowany.' }, { status: 401 });
    }

    try {
        const profile = await currentProfile(player);
        const ranking = await globalRanking(player.id);

        return NextResponse.json({ profile, ranking });
    } catch (error) {
        if (isGameError(error)) {
            return NextResponse.json({ message: errorMessage(error) }, { status: 422 });
        }

        console.error('[api/game] load failed', error);

        return NextResponse.json({ message: 'Nie udało się wczytać postaci.' }, { status: 500 });
    }
}
