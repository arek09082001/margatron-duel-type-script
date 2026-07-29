import { NextResponse } from 'next/server';

import { errorMessage, isGameError } from '@/game/errors';
import { runAction, type GameAction } from '@/server/profileService';
import { currentPlayer } from '@/server/session';

export const dynamic = 'force-dynamic';

/**
 * Applies one player action server-side.
 *
 * The client sends the intent, never the resulting state — so edited
 * localStorage cannot hand anyone 10 000 gold any more.
 */
export async function POST(request: Request) {
    const player = await currentPlayer();

    if (!player) {
        return NextResponse.json({ message: 'Nie jesteś zalogowany.' }, { status: 401 });
    }

    let action: GameAction;

    try {
        action = (await request.json()) as GameAction;
    } catch {
        return NextResponse.json({ message: 'Nieprawidłowe żądanie.' }, { status: 400 });
    }

    if (!action || typeof action.type !== 'string') {
        return NextResponse.json({ message: 'Nieznana akcja.' }, { status: 400 });
    }

    try {
        const result = await runAction(player, action);

        return NextResponse.json(result);
    } catch (error) {
        // GameError is a rule the player broke ("not enough gold"), not a bug.
        if (isGameError(error)) {
            return NextResponse.json({ message: errorMessage(error) }, { status: 422 });
        }

        console.error('[api/game/action] failed', action.type, error);

        return NextResponse.json({ message: 'Akcja nie powiodła się.' }, { status: 500 });
    }
}
