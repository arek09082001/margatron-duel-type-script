import { NextResponse } from 'next/server';

import { createProfile, recalculate } from '@/game/profile';
import { hashPassword, SESSION_COOKIE, createSessionToken, sessionCookieOptions } from '@/server/auth';
import { prisma } from '@/server/prisma';
import { profileToRow } from '@/server/profileMapper';

export const dynamic = 'force-dynamic';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICK_PATTERN = /^[a-z0-9_]{4,20}$/i;

export async function POST(request: Request) {
    let body: { nick?: string; email?: string; password?: string };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ message: 'Nieprawidłowe żądanie.' }, { status: 400 });
    }

    const nick = (body.nick ?? '').trim();
    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';

    if (!NICK_PATTERN.test(nick)) {
        return NextResponse.json(
            { message: 'Nick musi mieć 4-20 znaków (litery, cyfry, podkreślnik).' },
            { status: 422 },
        );
    }

    if (!EMAIL_PATTERN.test(email)) {
        return NextResponse.json({ message: 'Podaj poprawny adres email.' }, { status: 422 });
    }

    if (password.length < 6) {
        return NextResponse.json({ message: 'Hasło musi mieć co najmniej 6 znaków.' }, { status: 422 });
    }

    const clash = await prisma.player.findFirst({
        where: { OR: [{ email }, { nick }] },
        select: { email: true, nick: true },
    });

    if (clash) {
        return NextResponse.json(
            {
                message:
                    clash.email === email
                        ? 'Konto z tym adresem email już istnieje.'
                        : 'Ten nick jest już zajęty.',
            },
            { status: 422 },
        );
    }

    // The player row and its starting character are created together, so a
    // half-registered account can never exist.
    const player = await prisma.$transaction(async (tx) => {
        const created = await tx.player.create({
            data: { email, nick, passwordHash: await hashPassword(password) },
            select: { id: true },
        });

        const profile = createProfile(created.id, nick);
        recalculate(profile);

        await tx.gameProfile.create({ data: { id: created.id, ...profileToRow(profile) } });

        return created;
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, createSessionToken(player.id), sessionCookieOptions);

    return response;
}
