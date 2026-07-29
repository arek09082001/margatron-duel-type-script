/**
 * Port of `config/game.php`. Values can be overridden per deployment through
 * Vercel environment variables (they must be `NEXT_PUBLIC_*` because the game
 * loop currently runs in the browser).
 */

function envInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10);

    return Number.isFinite(parsed) ? parsed : fallback;
}

export const GAME_CONFIG = {
    actionPoints: {
        regenerationSeconds: Math.max(
            1,
            envInt(process.env.NEXT_PUBLIC_GAME_ACTION_POINT_REGENERATION_SECONDS, 60),
        ),
        regenerationLimit: Math.max(
            0,
            envInt(process.env.NEXT_PUBLIC_GAME_ACTION_POINT_REGENERATION_LIMIT, 20),
        ),
    },
    rest: {
        options: {
            1: {
                durationSeconds: envInt(process.env.NEXT_PUBLIC_GAME_REST_ONE_MINUTE_SECONDS, 60),
                actionPoints: 2,
            },
            5: {
                durationSeconds: envInt(process.env.NEXT_PUBLIC_GAME_REST_FIVE_MINUTES_SECONDS, 300),
                actionPoints: 12,
            },
        } as Record<number, { durationSeconds: number; actionPoints: number }>,
        instant: {
            goldPrice: envInt(process.env.NEXT_PUBLIC_GAME_REST_INSTANT_GOLD_PRICE, 500),
        },
    },
} as const;

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.2.0';

export const INVENTORY_SIZE = 15;
export const ACTION_POINTS_PER_LEVEL = 5;
/** Idle time beyond this is not counted towards the "time played" achievement. */
export const PLAY_SESSION_GRACE_SECONDS = 300;
export const MAX_BATTLE_TURNS = 100;
export const STAGES_PER_LOCATION = 5;

export function actionPointRegenerationSeconds(): number {
    return GAME_CONFIG.actionPoints.regenerationSeconds;
}

export function actionPointRegenerationLimit(): number {
    return GAME_CONFIG.actionPoints.regenerationLimit;
}

export function restOptionMinutes(): number[] {
    return Object.keys(GAME_CONFIG.rest.options)
        .map((minutes) => Number.parseInt(minutes, 10))
        .sort((left, right) => left - right);
}

export function restOption(minutes: number): { durationSeconds: number; actionPoints: number } | null {
    return GAME_CONFIG.rest.options[minutes] ?? null;
}

export function instantRestGoldPrice(): number {
    return Math.max(0, GAME_CONFIG.rest.instant.goldPrice);
}
