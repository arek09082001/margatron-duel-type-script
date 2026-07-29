import { NextResponse } from 'next/server';

import type { GameAction } from '@/game/actions';
import { isGameError } from '@/game/errors';
import { runActions } from '@/server/profileService';
import { currentPlayer } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Bounds a single request so a runaway client cannot pin a serverless function. */
const MAX_ACTIONS_PER_REQUEST = 50;

/**
 * Applies a batch of player actions server-side.
 *
 * The client sends intents, never resulting state, so edited local storage
 * cannot hand anyone gold. Deterministic actions are applied optimistically in
 * the browser and flushed here in bulk — usually riding along with the battle
 * that triggered the flush, which keeps a burst of clicks to one request.
 */
export async function POST(request: Request) {
    const player = await currentPlayer();

    if (!player) {
        return NextResponse.json({ message: 'Nie jesteś zalogowany.' }, { status: 401 });
    }

    let body: { actions?: GameAction[] };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ message: 'Nieprawidłowe żądanie.' }, { status: 400 });
    }

    const actions = body.actions;

    if (!Array.isArray(actions) || actions.length === 0) {
        return NextResponse.json({ message: 'Brak akcji do wykonania.' }, { status: 400 });
    }

    if (actions.length > MAX_ACTIONS_PER_REQUEST) {
        return NextResponse.json({ message: 'Zbyt wiele akcji naraz.' }, { status: 400 });
    }

    if (actions.some((action) => !action || typeof action.type !== 'string')) {
        return NextResponse.json({ message: 'Nieznana akcja.' }, { status: 400 });
    }

    try {
        // Rule violations are reported per action inside the result, not as a
        // failed request — earlier actions in the batch did legitimately apply.
        return NextResponse.json(await runActions(player, actions));
    } catch (error) {
        if (isGameError(error)) {
            return NextResponse.json({ message: error.message }, { status: 422 });
        }

        console.error('[api/game/action] failed', error);

        return NextResponse.json({ message: 'Akcja nie powiodła się.' }, { status: 500 });
    }
}
