'use client';

/**
 * Client-side game store.
 *
 * Since Supabase landed, the server owns the game state: every action is sent
 * as an intent to `/api/game/action`, applied there against the pure domain
 * layer, persisted through Prisma, and the resulting profile comes back.
 *
 * The profile kept here is a render cache. It is ticked locally so action
 * points count up smoothly between actions — `settleProfile` is deterministic
 * from timestamps, so the client and the server always agree.
 */

import { create } from 'zustand';

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

type GameAction =
    | { type: 'addAttribute'; attribute: PlayerAttributeKey }
    | { type: 'selectMap'; mapId: number }
    | { type: 'rest'; minutes: number }
    | { type: 'instantRest' }
    | { type: 'buyPa'; amount: number }
    | { type: 'buyItem'; shopId: string; itemId: string | number }
    | { type: 'equipItem'; index: number }
    | { type: 'unequipItem'; slot: EquipmentSlot }
    | { type: 'sellItem'; index: number }
    | { type: 'sellAllItems' }
    | { type: 'usePotion'; index: number }
    | { type: 'fightStage'; locationId: string; stage: number }
    | { type: 'fightArena'; difficulty: ArenaDifficultyValue }
    | { type: 'fightTough'; locationId: string; enemyType: ToughEnemyKind };

type GameStore = {
    profile: GameProfile | null;
    ranking: PlayerRanking | null;
    /** False until the first `/api/game` load settles, so screens can wait. */
    loaded: boolean;
    /** True while an action is in flight — used to stop double-clicks. */
    busy: boolean;

    register: (nick: string, email: string, password: string) => Promise<void>;
    /** `identifier` is a nick or an email — both work. */
    login: (identifier: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    load: () => Promise<void>;

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
    async function dispatch(action: GameAction): Promise<BattleResult | undefined> {
        set({ busy: true });

        try {
            const response = await fetch('/api/game/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(action),
            });

            if (!response.ok) {
                throw await failure(response);
            }

            const { profile, battle } = (await response.json()) as {
                profile: GameProfile;
                battle?: BattleResult;
            };

            set({ profile });

            return battle;
        } finally {
            set({ busy: false });
        }
    }

    async function battleAction(action: GameAction): Promise<BattleResult> {
        const battle = await dispatch(action);

        if (!battle) {
            throw new GameError('Walka nie zwróciła wyniku.');
        }

        return battle;
    }

    return {
        profile: null,
        ranking: null,
        loaded: false,
        busy: false,

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
            await fetch('/api/auth/logout', { method: 'POST' });

            set({ profile: null, ranking: null, loaded: false });
        },

        load: async () => {
            // A character played before Supabase still lives in localStorage.
            // Offer it once; the server only accepts it for an empty account.
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
                    // Offline or a transient failure: keep the local save and
                    // retry on the next load rather than losing the character.
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

        addAttribute: async (attribute) => void (await dispatch({ type: 'addAttribute', attribute })),
        selectMap: async (mapId) => void (await dispatch({ type: 'selectMap', mapId })),
        rest: async (minutes) => void (await dispatch({ type: 'rest', minutes })),
        instantRest: async () => void (await dispatch({ type: 'instantRest' })),
        buyPa: async (amount) => void (await dispatch({ type: 'buyPa', amount })),
        buyItem: async (shopId, itemId) => void (await dispatch({ type: 'buyItem', shopId, itemId })),
        equipItem: async (index) => void (await dispatch({ type: 'equipItem', index })),
        unequipItem: async (slot) => void (await dispatch({ type: 'unequipItem', slot })),
        sellItem: async (index) => void (await dispatch({ type: 'sellItem', index })),
        sellAllItems: async () => void (await dispatch({ type: 'sellAllItems' })),
        usePotion: async (index) => void (await dispatch({ type: 'usePotion', index })),

        fightStage: (locationId, stage) => battleAction({ type: 'fightStage', locationId, stage }),
        fightArena: (difficulty) => battleAction({ type: 'fightArena', difficulty }),
        fightTough: (locationId, enemyType) =>
            battleAction({ type: 'fightTough', locationId, enemyType }),
    };
});
