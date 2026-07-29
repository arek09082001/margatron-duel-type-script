import { NextResponse } from 'next/server';

import {
    createSessionToken,
    hashPassword,
    isLegacyHash,
    SESSION_COOKIE,
    sessionCookieOptions,
    verifyPassword,
} from '@/server/auth';
import { prisma } from '@/server/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    let body: { identifier?: string; password?: string };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ message: 'Nieprawidłowe żądanie.' }, { status: 400 });
    }

    const identifier = (body.identifier ?? '').trim();
    const password = body.password ?? '';

    if (!identifier || !password) {
        return NextResponse.json({ message: 'Podaj nick lub email oraz hasło.' }, { status: 422 });
    }

    // Either credential works, so a player does not have to remember which one
    // they signed up with.
    const player = await prisma.player.findFirst({
        where: {
            OR: [{ email: identifier.toLowerCase() }, { nick: identifier }],
        },
        select: { id: true, passwordHash: true },
    });

    // Same message either way — revealing which accounts exist would let
    // anyone enumerate them.
    const invalid = NextResponse.json(
        { message: 'Nieprawidłowy nick/email lub hasło.' },
        { status: 401 },
    );

    if (!player || !(await verifyPassword(password, player.passwordHash))) {
        return invalid;
    }

    // Transparently upgrade characters carried over from the local-only build.
    if (isLegacyHash(player.passwordHash)) {
        await prisma.player.update({
            where: { id: player.id },
            data: { passwordHash: await hashPassword(password) },
        });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, createSessionToken(player.id), sessionCookieOptions);

    return response;
}
