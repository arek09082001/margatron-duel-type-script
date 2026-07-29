import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 moved connection URLs out of `schema.prisma` and into this file.
 *
 * `DIRECT_URL` is the unpooled connection (port 5432) that migrations need;
 * PgBouncer cannot run DDL in a transaction. The runtime client uses the
 * pooled `DATABASE_URL` instead — see `src/server/prisma.ts`.
 */
export default defineConfig({
    schema: path.join('prisma', 'schema.prisma'),
    migrations: {
        path: path.join('prisma', 'migrations'),
        seed: 'tsx prisma/seed.ts',
    },
    datasource: {
        // Read leniently rather than through Prisma's `env()` helper, which
        // throws while the config loads. `prisma generate` runs during the
        // Vercel build and does not need a database, so a missing value must
        // not break the build — only the migrate commands actually need it,
        // and they fail with their own clear error.
        url: process.env.DIRECT_URL ?? '',
    },
});
