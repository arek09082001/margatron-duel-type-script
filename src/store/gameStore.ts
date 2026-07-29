'use client';

/**
 * The single client-side game store.
 *
 * It plays the role the Laravel controllers used to: take a player action, run
 * it against the domain layer inside a transaction-like draft, and persist the
 * result. Swap `persist` for a Supabase-backed implementation and the
 * components keep working unchanged.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { fightArena, fightStage, fightToughEnemy } from '@/game/battle';
import { GameError } from '@/game/errors';
import { buyItem, consumeItem, equip, sell, unequip } from '@/game/inventory';
import * as profileService from '@/game/profile';
import { instantRest, startRest } from '@/game/rest';
import { buyPa, selectMap, settleProfile } from '@/game/state';
import type {
    ArenaDifficultyValue,
    BattleResult,
    EquipmentSlot,
    GameProfile,
    PlayerAttributeKey,
    ToughEnemyKind,
} from '@/game/types';
import { createAccountId, createSalt, hashPassword, type Account } from './persistence';

export const STORAGE_KEY = 'mgduel:v1';

type PersistedState = {
    accounts: Account[];
    profiles: Record<string, GameProfile>;
    currentAccountId: string | null;
};

type GameStore = PersistedState & {
    hydrated: boolean;
    setHydrated: (hydrated: boolean) => void;

    register: (nick: string, email: string, password: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;

    /** Brings the active profile up to date with the wall clock. */
    tick: () => void;

    addAttribute: (attribute: PlayerAttributeKey) => void;
    selectMap: (mapId: number) => void;
    rest: (minutes: number) => void;
    instantRest: () => void;
    buyPa: (amount: number) => void;
    buyItem: (shopId: string, itemId: string | number) => void;
    equipItem: (index: number) => void;
    unequipItem: (slot: EquipmentSlot) => void;
    sellItem: (index: number) => void;
    usePotion: (index: number) => void;

    fightStage: (locationId: string, stage: number) => BattleResult;
    fightArena: (difficulty: ArenaDifficultyValue) => BattleResult;
    fightTough: (locationId: string, enemyType: ToughEnemyKind) => BattleResult;
};

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export const useGameStore = create<GameStore>()(
    persist(
        (set, get) => {
            /**
             * Runs `mutator` against a throwaway clone of the active profile.
             *
             * If it throws — a `GameError` such as "not enough gold" — the clone
             * is discarded and nothing is persisted, which gives the same
             * all-or-nothing behaviour as the old `DB::transaction` wrapper.
             */
            function mutate<T>(mutator: (profile: GameProfile, now: number) => T): T {
                const { currentAccountId, profiles } = get();
                const current = currentAccountId ? profiles[currentAccountId] : null;

                if (!current) {
                    throw new GameError('Brak aktywnej postaci.');
                }

                const draft = structuredClone(current);
                const now = Date.now();

                settleProfile(draft, now);
                const result = mutator(draft, now);
                profileService.recalculate(draft);

                set({ profiles: { ...get().profiles, [draft.id]: draft } });

                return result;
            }

            return {
                accounts: [],
                profiles: {},
                currentAccountId: null,
                hydrated: false,

                setHydrated: (hydrated) => set({ hydrated }),

                register: async (nick, email, password) => {
                    const normalizedEmail = normalizeEmail(email);
                    const { accounts, profiles } = get();

                    if (accounts.some((account) => account.email === normalizedEmail)) {
                        throw new GameError('Konto z tym adresem email już istnieje.');
                    }

                    if (accounts.some((account) => account.nick.toLowerCase() === nick.toLowerCase())) {
                        throw new GameError('Ten nick jest już zajęty.');
                    }

                    const id = createAccountId();
                    const salt = createSalt();
                    const account: Account = {
                        id,
                        nick,
                        email: normalizedEmail,
                        salt,
                        passwordHash: await hashPassword(password, salt),
                        createdAt: Date.now(),
                    };

                    set({
                        accounts: [...accounts, account],
                        profiles: { ...profiles, [id]: profileService.createProfile(id, nick) },
                        currentAccountId: id,
                    });
                },

                login: async (email, password) => {
                    const normalizedEmail = normalizeEmail(email);
                    const { accounts, profiles } = get();
                    const account = accounts.find((candidate) => candidate.email === normalizedEmail);

                    if (!account) {
                        throw new GameError('Nieprawidłowy email lub hasło.');
                    }

                    const passwordHash = await hashPassword(password, account.salt);

                    if (passwordHash !== account.passwordHash) {
                        throw new GameError('Nieprawidłowy email lub hasło.');
                    }

                    // Self-heal: a profile can go missing if storage was cleared
                    // partially, so recreate it rather than dead-ending the login.
                    const profile = profiles[account.id] ?? profileService.createProfile(account.id, account.nick);

                    set({
                        currentAccountId: account.id,
                        profiles: { ...profiles, [account.id]: profile },
                    });
                },

                logout: () => set({ currentAccountId: null }),

                tick: () => {
                    const { currentAccountId, profiles } = get();
                    const current = currentAccountId ? profiles[currentAccountId] : null;

                    if (!current) {
                        return;
                    }

                    const draft = structuredClone(current);

                    if (!settleProfile(draft, Date.now())) {
                        return;
                    }

                    set({ profiles: { ...profiles, [draft.id]: draft } });
                },

                addAttribute: (attribute) => mutate((profile) => profileService.addAttribute(profile, attribute)),
                selectMap: (mapId) => mutate((profile) => selectMap(profile, mapId)),
                rest: (minutes) => mutate((profile, now) => startRest(profile, minutes, now)),
                instantRest: () => mutate((profile, now) => instantRest(profile, now)),
                buyPa: (amount) => mutate((profile, now) => buyPa(profile, amount, now)),
                buyItem: (shopId, itemId) => mutate((profile) => buyItem(profile, shopId, itemId)),
                equipItem: (index) => mutate((profile) => equip(profile, index)),
                unequipItem: (slot) => mutate((profile) => unequip(profile, slot)),
                sellItem: (index) => mutate((profile) => sell(profile, index)),
                usePotion: (index) => mutate((profile, now) => consumeItem(profile, index, now)),

                fightStage: (locationId, stage) =>
                    mutate((profile, now) => fightStage(profile, locationId, stage, now)),
                fightArena: (difficulty) => mutate((profile, now) => fightArena(profile, difficulty, now)),
                fightTough: (locationId, enemyType) =>
                    mutate((profile, now) => fightToughEnemy(profile, locationId, enemyType, now)),
            };
        },
        {
            name: STORAGE_KEY,
            version: 1,
            partialize: (state): PersistedState => ({
                accounts: state.accounts,
                profiles: state.profiles,
                currentAccountId: state.currentAccountId,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHydrated(true);
            },
        },
    ),
);
