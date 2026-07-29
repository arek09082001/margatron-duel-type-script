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

export function shuffled<T>(items: readonly T[]): T[] {
    const copy = [...items];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = randomInt(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
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
