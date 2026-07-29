import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@/generated/prisma';

/**
 * Lazily constructed Prisma client.
 *
 * Next.js imports every route module during `next build` to collect page data,
 * so anything that runs at import time runs at build time too. Creating the
 * client eagerly therefore broke the build whenever `DATABASE_URL` was absent
 * — which is exactly the state of a Vercel project before its environment
 * variables are filled in.
 *
 * The proxy defers construction to the first property access, which only
 * happens while serving a request.
 */
function createClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error('DATABASE_URL is not set.');
    }

    // The pooled connection (PgBouncer, port 6543) is the right one at runtime:
    // serverless functions open many short-lived connections, which a direct
    // connection would exhaust. Migrations use DIRECT_URL via prisma.config.ts.
    return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Next.js hot-reloads modules in dev, which would otherwise open a new pool on
// every reload until Postgres refuses connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function client(): PrismaClient {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = createClient();
    }

    return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
    get(_target, property, receiver) {
        const instance = client();
        const value = Reflect.get(instance, property, receiver);

        return typeof value === 'function' ? value.bind(instance) : value;
    },
});
