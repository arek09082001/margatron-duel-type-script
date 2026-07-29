import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@/generated/prisma';

/**
 * Prisma 7 talks to Postgres through a driver adapter. The pooled
 * `DATABASE_URL` (PgBouncer, port 6543) is the right one at runtime —
 * serverless functions open many short-lived connections, which a direct
 * connection would exhaust. Migrations use `DIRECT_URL` via prisma.config.ts.
 */
function createClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error('DATABASE_URL is not set.');
    }

    return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Next.js hot-reloads modules in dev, which would otherwise open a new pool on
// every reload until Postgres refuses connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
