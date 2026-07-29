/**
 * The storage seam.
 *
 * Today the whole game state lives in the browser (Zustand + localStorage).
 * When Supabase lands, implement `GameBackend` against it and swap the export
 * at the bottom of this file — nothing in `src/game` or the components needs
 * to change, because they only ever talk to the store.
 *
 * See `docs/SUPABASE.md` for the target schema and the migration checklist.
 */

import type { GameProfile } from '@/game/types';

export type Account = {
    id: string;
    nick: string;
    email: string;
    /** Random per-account salt, hex encoded. */
    salt: string;
    /** SHA-256 of `salt + password`, hex encoded. */
    passwordHash: string;
    createdAt: number;
};

export type GameBackend = {
    /** Every profile visible to the leaderboard. */
    listProfiles(): Promise<GameProfile[]>;
    loadProfile(accountId: string): Promise<GameProfile | null>;
    saveProfile(profile: GameProfile): Promise<void>;
};

function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

export function createSalt(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    return toHex(bytes.buffer);
}

/**
 * Local-only password gate.
 *
 * This is deliberately simple: with no server there is nothing to authenticate
 * *against*, and the profile data sits in the same localStorage anyway. It
 * exists so the original login screen keeps working and so passwords are not
 * stored in plain text. Real authentication arrives with Supabase Auth.
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
    const encoded = new TextEncoder().encode(`${salt}:${password}`);
    const digest = await crypto.subtle.digest('SHA-256', encoded);

    return toHex(digest);
}

export function createAccountId(): string {
    return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : createSalt();
}
