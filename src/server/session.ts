import { cookies } from 'next/headers';

import { prisma } from './prisma';
import { SESSION_COOKIE, readSessionToken } from './auth';

export type SessionPlayer = {
    id: string;
    email: string;
    nick: string;
};

/** The signed-in player, or null. Verifies the cookie signature and the row. */
export async function currentPlayer(): Promise<SessionPlayer | null> {
    const store = await cookies();
    const playerId = readSessionToken(store.get(SESSION_COOKIE)?.value);

    if (!playerId) {
        return null;
    }

    // Re-read the row rather than trusting the cookie's contents: a deleted
    // account must stop working immediately, not when the token expires.
    return prisma.player.findUnique({
        where: { id: playerId },
        select: { id: true, email: true, nick: true },
    });
}
