/**
 * Self-contained authentication: password hashing plus a signed session cookie.
 *
 * No third-party auth service and no native dependencies — everything here is
 * `node:crypto`, which keeps the serverless bundle small and portable.
 */

import {
    createHash,
    createHmac,
    randomBytes,
    scrypt as scryptCallback,
    timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
    password: string,
    salt: string,
    keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const SESSION_COOKIE = 'mgduel_session';

/** Compares without leaking length or content through timing. */
function safeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);

    return left.length === right.length && timingSafeEqual(left, right);
}

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const key = await scrypt(password, salt, KEY_LENGTH);

    return `scrypt$${salt}$${key.toString('hex')}`;
}

/**
 * Verifies against either hash format.
 *
 * `sha256` entries come from the local-only build, where the browser hashed
 * `salt:password` with SHA-256. Supporting it means a migrated player keeps
 * the password they already had — we never need to know it.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const [scheme, salt, expected] = stored.split('$');

    if (!scheme || !salt || !expected) {
        return false;
    }

    if (scheme === 'scrypt') {
        const key = await scrypt(password, salt, KEY_LENGTH);

        return safeEqual(key.toString('hex'), expected);
    }

    if (scheme === 'sha256') {
        const digest = createHash('sha256').update(`${salt}:${password}`).digest('hex');

        return safeEqual(digest, expected);
    }

    return false;
}

/** True when the hash should be upgraded to scrypt after a successful login. */
export function isLegacyHash(stored: string): boolean {
    return stored.startsWith('sha256$');
}

function secret(): string {
    const value = process.env.AUTH_SECRET;

    if (!value || value.length < 16) {
        throw new Error('AUTH_SECRET is missing or too short (needs at least 16 characters).');
    }

    return value;
}

function sign(payload: string): string {
    return createHmac('sha256', secret()).update(payload).digest('base64url');
}

/**
 * Session token: `<base64url payload>.<hmac>`.
 *
 * The payload is readable but not forgeable, which is all we need — it only
 * carries the player id and an expiry.
 */
export function createSessionToken(playerId: string): string {
    const payload = Buffer.from(
        JSON.stringify({ sub: playerId, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 }),
    ).toString('base64url');

    return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): string | null {
    if (!token) {
        return null;
    }

    const [payload, signature] = token.split('.');

    if (!payload || !signature || !safeEqual(sign(payload), signature)) {
        return null;
    }

    try {
        const { sub, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
            sub?: string;
            exp?: number;
        };

        if (!sub || typeof exp !== 'number' || exp < Date.now()) {
            return null;
        }

        return sub;
    } catch {
        return null;
    }
}

export const sessionCookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
} as const;
