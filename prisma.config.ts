import 'dotenv/config';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

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
        url: env('DIRECT_URL'),
    },
});
