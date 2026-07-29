'use client';

/**
 * Client-side game store.
 *
 * The server owns the game state, but waiting for a round trip on every click
 * made the game feel sluggish. So actions take two paths:
 *
 * - **Deterministic** ones (equip, sell, buy, attributes, rest…) are applied
 *   locally at once against the same pure domain functions the server runs,
 *   then queued. The UI updates instantly and the queue is flushed in one
 *   request shortly after.
 * - **Battles** roll dice, so a local simulation would disagree with the
 *   server's. They go straight out — but carry any queued actions with them,
 *   so a burst of clicks followed by a fight is still a single request.
 *
 * The server's profile always wins on reconcile.
 */

import { create } from 'zustand';

import { applyGameAction, isDeterministic, type GameAction } from '@/game/actions';
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

/** How long a queued batch waits for more actions before going out. */
const FLUSH_DELAY_MS = 600;
/** Flush early rather than let a long burst drift far from the server. */
const MAX_PENDING = 20;

type ActionResponse = {
    profile: GameProfile;
    battles: Array<BattleResult | null>;
    failedIndex?: number;
    message?: string;
};

type GameStore = {
    profile: GameProfile | null;
    ranking: PlayerRanking | null;
    /** False until the first `/api/game` load settles, so screens can wait. */
    loaded: boolean;
    /** True while a battle is in flight — deterministic actions never block. */
    busy: boolean;
    /** Number of actions applied locally but not yet confirmed by the server. */
    pendingCount: number;
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
    // Queue state lives outside the store: it is plumbing, not something the
    // UI renders, and mutating it must not trigger re-renders.
    let pending: GameAction[] = [];
    let flushTimer: number | undefined;
    let inFlight: Promise<void> | null = null;

    function cancelFlushTimer(): void {
        if (flushTimer !== undefined) {
            window.clearTimeout(flushTimer);
            flushTimer = undefined;
        }
    }

    async function send(actions: GameAction[]): Promise<ActionResponse> {
        const response = await fetch('/api/game/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actions }),
            // Lets a flush triggered by the page closing still reach the
            // server. Batches are far below the 64 KB keepalive limit.
            keepalive: true,
        });

        if (!response.ok) {
            throw await failure(response);
        }

        return (await response.json()) as ActionResponse;
    }

    /**
     * Adopts the server's profile and reports a rejected action.
     *
     * A rejection means the optimistic copy had drifted — usually because
     * another device spent the gold first. Replacing the profile wholesale
     * rolls back the failed action and everything queued behind it.
     */
    function reconcile(result: ActionResponse): void {
        set({ profile: result.profile });

        if (result.failedIndex !== undefined) {
            throw new GameError(result.message ?? 'Akcja nie powiodła się.');
        }
    }

    async function flushNow(): Promise<void> {
        cancelFlushTimer();

        if (pending.length === 0) {
            return;
        }

        const batch = pending;
        pending = [];
        set({ pendingCount: 0 });

        try {
            reconcile(await send(batch));
        } catch (error) {
            // Put nothing back: the server's profile (or the reload below) is
            // the truth, and replaying a rejected batch would fail again.
            if (!(error instanceof GameError)) {
                await get().load();
            }

            throw error;
        }
    }

    /** Serialises flushes so batches cannot overtake each other. */
    function flush(): Promise<void> {
        inFlight = (inFlight ?? Promise.resolve()).then(flushNow, flushNow);

        return inFlight;
    }

    function scheduleFlush(): void {
        cancelFlushTimer();
        flushTimer = window.setTimeout(
            () => void flush().catch((error: unknown) => reportBackgroundFailure(error)),
            FLUSH_DELAY_MS,
        );
    }

    /** Nobody is awaiting a debounced flush, so surface its failure in state. */
    function reportBackgroundFailure(error: unknown): void {
        set({
            lastError: error instanceof GameError ? error.message : 'Nie udało się zapisać akcji.',
        });
    }

    /** Applies a deterministic action locally, then queues it. */
    async function optimistic(action: GameAction): Promise<void> {
        const current = get().profile;

        if (!current) {
            throw new GameError('Brak aktywnej postaci.');
        }

        const draft = structuredClone(current);

        // Runs the same code the server will, so a rule violation surfaces
        // here immediately and never reaches the queue.
        settleProfile(draft, Date.now());
        applyGameAction(draft, action, Date.now());

        set({ profile: draft });
        pending = [...pending, action];
        set({ pendingCount: pending.length });

        if (pending.length >= MAX_PENDING) {
            await flush();

            return;
        }

        scheduleFlush();
    }

    /** Runs a battle server-side, carrying any queued actions along with it. */
    async function battle(action: GameAction): Promise<BattleResult> {
        cancelFlushTimer();
        set({ busy: true });

        const batch = [...pending, action];
        pending = [];
        set({ pendingCount: 0 });

        try {
            const result = await send(batch);
            reconcile(result);

            const outcome = result.battles[result.battles.length - 1];

            if (!outcome) {
                throw new GameError('Walka nie zwróciła wyniku.');
            }

            return outcome;
        } finally {
            set({ busy: false });
        }
    }

    function enqueue(action: GameAction): Promise<void> {
        return isDeterministic(action) ? optimistic(action) : battle(action).then(() => undefined);
    }

    return {
        profile: null,
        ranking: null,
        loaded: false,
        busy: false,
        pendingCount: 0,
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
            // Don't strand unsent progress on the way out.
            await flush().catch(() => {});
            set({ lastError: null });
            await fetch('/api/auth/logout', { method: 'POST' });

            set({ profile: null, ranking: null, loaded: false });
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

            const { profile, ranking } = (await response.json()) as {
                profile: GameProfile;
                ranking: PlayerRanking;
            };

            set({ profile, ranking, loaded: true });
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

        addAttribute: (attribute) => enqueue({ type: 'addAttribute', attribute }),
        selectMap: (mapId) => enqueue({ type: 'selectMap', mapId }),
        rest: (minutes) => enqueue({ type: 'rest', minutes }),
        instantRest: () => enqueue({ type: 'instantRest' }),
        buyPa: (amount) => enqueue({ type: 'buyPa', amount }),
        buyItem: (shopId, itemId) => enqueue({ type: 'buyItem', shopId, itemId }),
        equipItem: (index) => enqueue({ type: 'equipItem', index }),
        unequipItem: (slot) => enqueue({ type: 'unequipItem', slot }),
        sellItem: (index) => enqueue({ type: 'sellItem', index }),
        sellAllItems: () => enqueue({ type: 'sellAllItems' }),
        usePotion: (index) => enqueue({ type: 'usePotion', index }),

        fightStage: (locationId, stage) => battle({ type: 'fightStage', locationId, stage }),
        fightArena: (difficulty) => battle({ type: 'fightArena', difficulty }),
        fightTough: (locationId, enemyType) => battle({ type: 'fightTough', locationId, enemyType }),
    };
});
