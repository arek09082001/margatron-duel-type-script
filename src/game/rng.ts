/**
 * Randomness helpers mirroring the PHP `random_int` / `array_rand` / `shuffle`
 * calls. Uses `crypto.getRandomValues` when available so drop rolls are not
 * trivially predictable, falling back to `Math.random` during SSR.
 */

function randomFloat(): number {
    const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

    if (cryptoApi?.getRandomValues) {
        const buffer = new Uint32Array(1);
        cryptoApi.getRandomValues(buffer);

        return buffer[0] / 0x1_0000_0000;
    }

    return Math.random();
}

/** Inclusive on both ends, like PHP's `random_int`. */
export function randomInt(min: number, max: number): number {
    const low = Math.ceil(min);
    const high = Math.floor(max);

    if (high <= low) {
        return low;
    }

    return low + Math.floor(randomFloat() * (high - low + 1));
}

/** A 0.01–100.00 roll, matching `random_int(1, 10_000) / 100`. */
export function percentRoll(): number {
    return randomInt(1, 10_000) / 100;
}

export function pick<T>(items: readonly T[]): T {
    return items[randomInt(0, items.length - 1)];
}

/** Weighted variant of `pick`. Entries with a weight of 0 never come up. */
export function pickWeighted<T>(items: readonly T[], weightOf: (item: T) => number): T {
    const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0);

    if (total <= 0) {
        return pick(items);
    }

    let cursor = randomFloat() * total;

    for (const item of items) {
        cursor -= Math.max(0, weightOf(item));

        if (cursor <= 0) {
            return item;
        }
    }

    return items[items.length - 1];
}

export function shuffled<T>(items: readonly T[]): T[] {
    const copy = [...items];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = randomInt(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
}

/**
 * Where a generated item gets its randomness from.
 *
 * Drops roll live; shop stock does not. A shop item has to come out identical
 * every time it is built — the snapshot rebuilds it on every tick and the
 * purchase rebuilds it again — so shops hand in a seeded source instead of the
 * live one and stop rerolling the bonus stats under the player's cursor.
 */
export type RandomSource = {
    int(min: number, max: number): number;
    pick<T>(items: readonly T[]): T;
    shuffled<T>(items: readonly T[]): T[];
};

export const LIVE_RANDOM: RandomSource = { int: randomInt, pick, shuffled };

/** FNV-1a, so a string seed spreads across the whole 32-bit range. */
function hashSeed(seed: string): number {
    let hash = 0x811c9dc5;

    for (let index = 0; index < seed.length; index++) {
        hash ^= seed.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }

    return hash >>> 0;
}

/** Deterministic source: the same seed always yields the same sequence. */
export function seededRandom(seed: string): RandomSource {
    let state = hashSeed(seed) || 1;

    // mulberry32 — small, fast, and good enough for stat rolls.
    const next = (): number => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = Math.imul(state ^ (state >>> 15), 1 | state);
        value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;

        return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
    };

    const int = (min: number, max: number): number => {
        const low = Math.ceil(min);
        const high = Math.floor(max);

        return high <= low ? low : low + Math.floor(next() * (high - low + 1));
    };

    return {
        int,
        pick: (items) => items[int(0, items.length - 1)],
        shuffled: (items) => {
            const copy = [...items];

            for (let i = copy.length - 1; i > 0; i--) {
                const j = int(0, i);
                [copy[i], copy[j]] = [copy[j], copy[i]];
            }

            return copy;
        },
    };
}

/** Replacement for `bin2hex(random_bytes(n))`. */
export function randomHex(bytes: number): string {
    let hex = '';

    for (let i = 0; i < bytes; i++) {
        hex += randomInt(0, 255).toString(16).padStart(2, '0');
    }

    return hex;
}

export function randomId(prefix: string): string {
    return `${prefix}${randomHex(8)}`;
}
