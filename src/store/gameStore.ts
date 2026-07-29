'use client';

/**
 * Client-side game store — the browser holds the authoritative game state.
 *
 * Every action, battles included, is applied here against the pure domain
 * functions and rendered immediately, so fighting has no round trip at all.
 * The resulting profile is pushed to the server when the player leaves a
 * fight, hides the tab, or after a short idle.
 *
 * That means the server trusts this payload: anyone can edit their own save.
 * It is a deliberate trade for a single-player game — a battle rolls dice, so
 * the server could not reproduce a locally-simulated fight anyway without
 * either replaying it (different numbers) or being handed the seed.
 *
 * The one invariant still enforced server-side is the revision check, which
 * keeps a stale tab from overwriting newer progress from another device.
 */

import { create } from 'zustand';

import { applyGameAction, type GameAction } from '@/game/actions';
import { GameError } from '@/game/errors';
import { settleProfile } from '@/game/state';
import type {
    ArenaDifficultyValue,
    BattleResult,
    EquipmentSlot,
    GameProfile,
    PlayerAttributeKey,
    PlayerRanking,
    ToughEnemyKind,
} from '@/game/types';
import { readLegacyLocalProfile, clearLegacyLocalProfile } from './legacyLocalSave';

/**
 * Idle delay before an unsaved profile is pushed.
 *
 * Long enough that a chain of fights is one request, short enough that a
 * crashed tab loses little. Leaving a fight flushes immediately anyway.
 */
const FLUSH_DELAY_MS = 4000;

type SyncResponse = {
    profile: GameProfile;
    revision: string;
};

type GameStore = {
    profile: GameProfile | null;
    ranking: PlayerRanking | null;
    /** False until the first `/api/game` load settles, so screens can wait. */
    loaded: boolean;
    /** Kept for compatibility with screens that disable controls; nothing blocks now. */
    busy: boolean;
    /** True while local progress has not reached the server yet. */
    unsaved: boolean;
    /**
     * Message from a rejected background flush.
     *
     * A debounced flush has no caller to throw at, so a rejection would
     * otherwise roll the profile back silently and leave the player wondering
     * where their gold went. Screens surface and clear this.
     */
    lastError: string | null;
    clearError: () => void;

    register: (nick: string, email: string, password: string) => Promise<void>;
    /** `identifier` is a nick or an email — both work. */
    login: (identifier: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    load: () => Promise<void>;
    /** Sends any queued actions now. Safe to call when the queue is empty. */
    flush: () => Promise<void>;

    tick: () => void;

    addAttribute: (attribute: PlayerAttributeKey) => Promise<void>;
    selectMap: (mapId: number) => Promise<void>;
    rest: (minutes: number) => Promise<void>;
    instantRest: () => Promise<void>;
    buyPa: (amount: number) => Promise<void>;
    buyItem: (shopId: string, itemId: string | number) => Promise<void>;
    equipItem: (index: number) => Promise<void>;
    unequipItem: (slot: EquipmentSlot) => Promise<void>;
    sellItem: (index: number) => Promise<void>;
    sellAllItems: () => Promise<void>;
    usePotion: (index: number) => Promise<void>;

    fightStage: (locationId: string, stage: number) => Promise<BattleResult>;
    fightArena: (difficulty: ArenaDifficultyValue) => Promise<BattleResult>;
    fightTough: (locationId: string, enemyType: ToughEnemyKind) => Promise<BattleResult>;
};

/** Turns a non-2xx API response into the `GameError` the UI already handles. */
async function failure(response: Response): Promise<GameError> {
    let message = 'Akcja nie powiodła się.';

    try {
        const body = (await response.json()) as { message?: string };
        message = body.message ?? message;
    } catch {
        // Non-JSON body (a proxy error page, say) — keep the generic message.
    }

    return new GameError(message);
}

export const useGameStore = create<GameStore>()((set, get) => {
    // Sync plumbing lives outside the store: it is not rendered, and touching
    // it must not trigger re-renders.
    let revision: string | null = null;
    let dirty = false;
    let flushTimer: number | undefined;
    let inFlight: Promise<void> | null = null;

    function cancelFlushTimer(): void {
        if (flushTimer !== undefined) {
            window.clearTimeout(flushTimer);
            flushTimer = undefined;
        }
    }

    function adopt(state: SyncResponse): void {
        revision = state.revision;
        dirty = false;
        set({ profile: state.profile, unsaved: false });
    }

    async function pushProfile(): Promise<void> {
        cancelFlushTimer();

        const profile = get().profile;

        if (!dirty || !profile || revision === null) {
            return;
        }

        // Clear the flag first: an action landing mid-request re-marks it, so
        // the next flush picks it up instead of the change being lost.
        dirty = false;
        set({ unsaved: false });

        const response = await fetch('/api/game/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile, baseRevision: revision }),
            // Lets a flush triggered by the page closing still get out.
            keepalive: true,
        });

        if (response.status === 409) {
            // Another device wrote first. Its state wins — replaying ours would
            // wipe out progress we never saw.
            const conflict = (await response.json()) as SyncResponse & { message?: string };
            adopt(conflict);

            throw report(
                new GameError(
                    conflict.message ??
                        'Postęp z innego urządzenia był nowszy — wczytano go ponownie.',
                ),
            );
        }

        if (!response.ok) {
            // Keep the changes and retry on the next flush rather than losing them.
            dirty = true;
            set({ unsaved: true });

            throw report(await failure(response));
        }

        adopt((await response.json()) as SyncResponse);
    }

    /** Serialises flushes so two pushes cannot race on the same revision. */
    function flush(): Promise<void> {
        inFlight = (inFlight ?? Promise.resolve()).then(pushProfile, pushProfile);

        return inFlight;
    }

    function scheduleFlush(): void {
        cancelFlushTimer();
        flushTimer = window.setTimeout(
            () => void flush().catch((error: unknown) => reportBackgroundFailure(error)),
            FLUSH_DELAY_MS,
        );
    }

    /**
     * Records a failure in state and hands it back to be thrown.
     *
     * Most flushes are fire-and-forget — a debounce timer, or a screen that
     * moved on — so relying on a caller's catch block silently loses the
     * reason. Reporting at the source means the player always finds out why
     * their state changed under them.
     */
    function report<T extends GameError>(error: T): T {
        set({ lastError: error.message });

        return error;
    }

    function reportBackgroundFailure(error: unknown): void {
        set({
            lastError: error instanceof GameError ? error.message : 'Nie udało się zapisać postępu.',
        });
    }

    /**
     * Applies an action locally and marks the profile unsaved.
     *
     * Rule violations throw here, exactly as they would on the server — the
     * same `applyGameAction` runs in both places.
     */
    function apply(action: GameAction): BattleResult | undefined {
        const current = get().profile;

        if (!current) {
            throw new GameError('Brak aktywnej postaci.');
        }

        const draft = structuredClone(current);
        const now = Date.now();

        settleProfile(draft, now);
        const battle = applyGameAction(draft, action, now);

        set({ profile: draft, unsaved: true });
        dirty = true;
        scheduleFlush();

        return battle;
    }

    function act(action: GameAction): Promise<void> {
        apply(action);

        return Promise.resolve();
    }

    function fight(action: GameAction): Promise<BattleResult> {
        const battle = apply(action);

        if (!battle) {
            throw new GameError('Walka nie zwróciła wyniku.');
        }

        return Promise.resolve(battle);
    }

    return {
        profile: null,
        ranking: null,
        loaded: false,
        busy: false,
        unsaved: false,
        lastError: null,

        clearError: () => set({ lastError: null }),

        register: async (nick, email, password) => {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nick, email, password }),
            });

            if (!response.ok) {
                throw await failure(response);
            }
        },

        login: async (identifier, password) => {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password }),
            });

            if (!response.ok) {
                throw await failure(response);
            }
        },

        logout: async () => {
            // Don't strand unsaved progress on the way out.
            await flush().catch(() => {});
            await fetch('/api/auth/logout', { method: 'POST' });

            revision = null;
            dirty = false;
            set({ profile: null, ranking: null, loaded: false, unsaved: false, lastError: null });
        },

        flush,

        load: async () => {
            // A character played before the database existed still lives in
            // localStorage. Offer it once; the server only accepts it for an
            // account with no profile.
            const legacy = readLegacyLocalProfile();

            if (legacy) {
                try {
                    const response = await fetch('/api/game/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(legacy),
                    });

                    // 409 means this account already has progress — expected on
                    // every device after the first, and not an error.
                    if (response.ok || response.status === 409) {
                        clearLegacyLocalProfile();
                    }
                } catch {
                    // Offline or transient: keep the local save and retry on
                    // the next load rather than losing the character.
                }
            }

            const response = await fetch('/api/game');

            if (!response.ok) {
                if (response.status === 401) {
                    set({ profile: null, ranking: null, loaded: true });

                    return;
                }

                throw await failure(response);
            }

            const loaded = (await response.json()) as {
                profile: GameProfile;
                revision: string;
                ranking: PlayerRanking;
            };

            revision = loaded.revision;
            dirty = false;
            set({ profile: loaded.profile, ranking: loaded.ranking, loaded: true, unsaved: false });
        },

        tick: () => {
            const current = get().profile;

            if (!current) {
                return;
            }

            const draft = structuredClone(current);

            if (!settleProfile(draft, Date.now())) {
                return;
            }

            set({ profile: draft });
        },

        addAttribute: (attribute) => act({ type: 'addAttribute', attribute }),
        selectMap: (mapId) => act({ type: 'selectMap', mapId }),
        rest: (minutes) => act({ type: 'rest', minutes }),
        instantRest: () => act({ type: 'instantRest' }),
        buyPa: (amount) => act({ type: 'buyPa', amount }),
        buyItem: (shopId, itemId) => act({ type: 'buyItem', shopId, itemId }),
        equipItem: (index) => act({ type: 'equipItem', index }),
        unequipItem: (slot) => act({ type: 'unequipItem', slot }),
        sellItem: (index) => act({ type: 'sellItem', index }),
        sellAllItems: () => act({ type: 'sellAllItems' }),
        usePotion: (index) => act({ type: 'usePotion', index }),

        fightStage: (locationId, stage) => fight({ type: 'fightStage', locationId, stage }),
        fightArena: (difficulty) => fight({ type: 'fightArena', difficulty }),
        fightTough: (locationId, enemyType) => fight({ type: 'fightTough', locationId, enemyType }),
    };
});
