/**
 * Port of `app/Game/Services/TavernRestService.php`.
 *
 * The Laravel build finished rests with a delayed queue job. Here the task's
 * `endsAt` timestamp is the source of truth and `completeExpiredRests` settles
 * whatever is due — so a rest still completes while the tab is closed.
 */

import {
    actionPointRegenerationLimit,
    instantRestGoldPrice,
    restOption,
    restOptionMinutes,
} from './config';
import { GameError } from './errors';
import type { GameProfile, RestOptionState, RestState, RestTask } from './types';

function requireOption(minutes: number): { durationSeconds: number; actionPoints: number } {
    const option = restOption(minutes);

    if (!option) {
        throw new GameError('Nieznana opcja odpoczynku.');
    }

    return option;
}

function isActive(task: RestTask, now: number): boolean {
    return task.endsAt > now;
}

function taskActionPoints(task: RestTask, minutes: number): number {
    return Math.max(0, task.actionPoints ?? requireOption(minutes).actionPoints);
}

export function restStateFor(profile: GameProfile, now: number = Date.now()): RestState {
    return {
        options: restOptionMinutes().map((minutes): RestOptionState => {
            const option = requireOption(minutes);
            const task = profile.restTasks[String(minutes)] ?? null;
            const active = task !== null && isActive(task, now);

            return {
                minutes,
                durationSeconds: option.durationSeconds,
                actionPoints: option.actionPoints,
                active,
                endsAt: active ? task!.endsAt : null,
                remainingSeconds: active ? Math.max(0, Math.ceil((task!.endsAt - now) / 1000)) : 0,
            };
        }),
        instant: {
            goldPrice: instantRestGoldPrice(),
            targetActionPoints: actionPointRegenerationLimit(),
        },
    };
}

export function startRest(profile: GameProfile, minutes: number, now: number = Date.now()): void {
    const option = requireOption(minutes);

    completeExpiredRests(profile, now);

    const key = String(minutes);
    const existing = profile.restTasks[key];

    if (existing && isActive(existing, now)) {
        throw new GameError('Ten odpoczynek już trwa.');
    }

    profile.restTasks = {
        ...profile.restTasks,
        [key]: {
            minutes,
            actionPoints: option.actionPoints,
            endsAt: now + option.durationSeconds * 1000,
        },
    };
}

/** Collects every rest whose timer has elapsed. Returns true when PA was granted. */
export function completeExpiredRests(profile: GameProfile, now: number = Date.now()): boolean {
    const remaining: Record<string, RestTask> = {};
    let actionPoints = 0;
    let changed = false;

    for (const [key, task] of Object.entries(profile.restTasks ?? {})) {
        if (isActive(task, now)) {
            remaining[key] = task;
            continue;
        }

        actionPoints += taskActionPoints(task, Number.parseInt(key, 10));
        changed = true;
    }

    if (!changed) {
        return false;
    }

    profile.pa = Math.max(0, profile.pa) + actionPoints;
    profile.paRegeneratedAt = now;
    profile.restTasks = remaining;

    return true;
}

export function instantRest(profile: GameProfile, now: number = Date.now()): void {
    const price = instantRestGoldPrice();

    if (profile.gold < price) {
        throw new GameError('Masz za mało złota.');
    }

    profile.gold -= price;
    profile.pa = Math.max(profile.pa, actionPointRegenerationLimit());
    profile.paRegeneratedAt = now;
}
