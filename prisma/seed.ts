/**
 * Seeds characters carried over from the local-only build.
 *
 * Idempotent: re-running updates the same rows rather than duplicating them,
 * but it will overwrite progress made since the last run — so run it once,
 * right after the first migration.
 *
 *   npx prisma db seed
 */

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma';
import { profileToRow } from '../src/server/profileMapper';
import { SEED_PLAYERS } from './seedData';

async function main(): Promise<void> {
    const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error('Set DIRECT_URL (or DATABASE_URL) before seeding.');
    }

    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

    try {
        for (const player of SEED_PLAYERS) {
            const profileData = profileToRow(player.profile);

            await prisma.player.upsert({
                where: { id: player.id },
                create: {
                    id: player.id,
                    email: player.email,
                    nick: player.nick,
                    passwordHash: player.passwordHash,
                },
                update: { email: player.email, nick: player.nick },
            });

            await prisma.gameProfile.upsert({
                where: { id: player.id },
                create: { id: player.id, ...profileData },
                update: profileData,
            });

            console.log(`seeded ${player.nick} <${player.email}> — level ${player.profile.level}`);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
