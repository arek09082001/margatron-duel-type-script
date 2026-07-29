'use client';

import { useEffect, useMemo, useState } from 'react';

import GameTopBar from '@/components/game/GameTopBar';
import ItemTooltip, { useItemTooltip } from '@/components/game/ItemTooltip';
import PlayerSidebar from '@/components/game/PlayerSidebar';
import ArenaView from '@/components/game/views/ArenaView';
import BattleSelectionView from '@/components/game/views/BattleSelectionView';
import BattleView from '@/components/game/views/BattleView';
import MapView from '@/components/game/views/MapView';
import RestView from '@/components/game/views/RestView';
import ShopView from '@/components/game/views/ShopView';
import ToughEnemyView from '@/components/game/views/ToughEnemyView';
import WorldMapView from '@/components/game/views/WorldMapView';
import Modal from '@/components/ui/Modal';
import SettingsModal from '@/components/ui/SettingsModal';
import { arenaPaCost } from '@/game/catalog';
import { EXPEDITION_FIGHTS, STAGES_PER_LOCATION } from '@/game/config';
import { errorMessage } from '@/game/errors';
import type {
    ArenaDifficultyValue,
    BattleResult,
    DecoratedLocation,
    EquipmentSlot,
    Item,
    PlayerAttributeKey,
    Stage,
    ToughEnemyKind,
    WorldMapPin,
} from '@/game/types';
import { decorateLocation } from '@/lib/locations';
import { useRequireCharacter } from '@/lib/useRequireCharacter';
import { useGameStore } from '@/store/gameStore';
import { useGameClock, useIncreaseFlash, useSnapshot } from '@/store/hooks';

type GameView = 'map' | 'battleSelection' | 'arena' | 'toughenemy' | 'battle' | 'shop' | 'rest' | 'worldMap';

/**
 * Enough context to repeat the fight the player just had.
 *
 * Expowiska used to be the only chainable fight because only the stage number
 * was remembered. Recording the whole action lets arena and tough-enemy runs
 * chain the same way.
 */
type LastFight =
    | { kind: 'stage'; locationId: string; stage: number }
    | { kind: 'arena'; difficulty: ArenaDifficultyValue }
    | { kind: 'tough'; locationId: string; enemyType: ToughEnemyKind };

const PA_OFFER_NAMES: Record<number, string> = {
    5: 'Mała butelka PA',
    10: 'Średnia butelka PA',
    15: 'Duża butelka PA',
};

export default function GamePage() {
    const { ready } = useRequireCharacter();
    const snapshot = useSnapshot();
    const store = useGameStore();
    const tooltip = useItemTooltip();

    const [view, setView] = useState<GameView>('map');
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
    const [battleLocationId, setBattleLocationId] = useState<string | null>(null);
    const [lastFight, setLastFight] = useState<LastFight | null>(null);
    const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
    const [remainingFights, setRemainingFights] = useState<number | null>(null);
    const [shopId, setShopId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showPaShop, setShowPaShop] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    useGameClock();
    const actionPointFlash = useIncreaseFlash(snapshot?.user.pa ?? null);

    // A queued action the server refused (usually because another device moved
    // first) rolls the profile back. Say so rather than letting gold or items
    // silently reappear.
    const backgroundError = useGameStore((state) => state.lastError);
    const clearBackgroundError = useGameStore((state) => state.clearError);

    useEffect(() => {
        if (backgroundError) {
            setAlertMessage(backgroundError);
            clearBackgroundError();
        }
    }, [backgroundError, clearBackgroundError]);

    // Locations are derived from the live snapshot rather than captured on
    // click, so stage unlocks show up immediately after a won fight.
    const selectedLocation = useMemo<DecoratedLocation | null>(() => {
        if (!snapshot || !selectedLocationId) {
            return null;
        }

        const location = snapshot.currentMap.locations.find(
            (candidate) => candidate.id === selectedLocationId,
        );

        return location ? decorateLocation(location, snapshot.user) : null;
    }, [snapshot, selectedLocationId]);

    const battleLocation = useMemo<DecoratedLocation | null>(() => {
        if (!snapshot || !battleLocationId) {
            return null;
        }

        const location = snapshot.currentMap.locations.find(
            (candidate) => candidate.id === battleLocationId,
        );

        return location ? decorateLocation(location, snapshot.user) : null;
    }, [snapshot, battleLocationId]);

    if (!ready || !snapshot) {
        return <div className="loading-screen">Wczytywanie gry…</div>;
    }

    const user = snapshot.user;

    /**
     * Runs a store action and surfaces `GameError` messages in the alert modal.
     *
     * Actions are round-trips to the server now, so this awaits them; failures
     * leave the local profile untouched because the store only adopts the
     * profile the server sends back.
     */
    async function run(action: () => Promise<unknown>): Promise<void> {
        try {
            await action();
        } catch (error) {
            setAlertMessage(errorMessage(error));
        }
    }

    /**
     * Leaving a location is the natural save point: fights resolve locally so a
     * chain of them costs no requests, and the result is pushed once the player
     * steps back out to the map.
     */
    function goBackToMap(): void {
        setView('map');
        setSelectedLocationId(null);
        void store.flush().catch(() => {
            // Reported through the store's lastError.
        });
    }

    function confirmEnterLocation(): void {
        if (!selectedLocation) {
            return;
        }

        switch (selectedLocation.type) {
            case 'battle':
                setBattleLocationId(selectedLocation.id);
                setView('battleSelection');
                break;
            case 'shop':
                setShopId(selectedLocation.shopId ?? null);
                setView('shop');
                break;
            case 'rest':
                setView('rest');
                break;
            case 'worldmap':
                setView('worldMap');
                break;
            case 'arena':
                setView('arena');
                break;
            case 'toughenemy':
                setView('toughenemy');
                break;
        }
    }

    function fightStage(stage: Stage): void {
        if (!stage.unlocked || !battleLocationId) {
            return;
        }

        void run(async () => {
            const result = await store.fightStage(battleLocationId, stage.stage);

            setRemainingFights((current) => (current ?? EXPEDITION_FIGHTS) - 1);
            setLastFight({ kind: 'stage', locationId: battleLocationId, stage: stage.stage });
            setBattleResult(result);
            setView('battle');
        });
    }

    function startArenaFight(difficulty: ArenaDifficultyValue): void {
        void run(async () => {
            const result = await store.fightArena(difficulty);

            setRemainingFights((current) => (current ?? EXPEDITION_FIGHTS) - 1);
            setLastFight({ kind: 'arena', difficulty });
            setBattleResult(result);
            setView('battle');
        });
    }

    function startToughFight(enemyType: ToughEnemyKind): void {
        if (!selectedLocationId) {
            return;
        }

        void run(async () => {
            const result = await store.fightTough(selectedLocationId, enemyType);

            setRemainingFights((current) => (current ?? EXPEDITION_FIGHTS) - 1);
            setLastFight({ kind: 'tough', locationId: selectedLocationId, enemyType });
            setBattleResult(result);
            setView('battle');
        });
    }

    /** Repeats the previous fight: next stage for expowiska, same fight otherwise. */
    function continueBattle(): void {
        if (!lastFight) {
            closeBattle();

            return;
        }

        if (lastFight.kind === 'arena') {
            startArenaFight(lastFight.difficulty);

            return;
        }

        if (lastFight.kind === 'tough') {
            startToughFight(lastFight.enemyType);

            return;
        }

        const stages = battleLocation?.stages ?? [];
        const nextStage = Math.min(STAGES_PER_LOCATION, lastFight.stage + (battleResult?.won ? 1 : 0));
        const target =
            stages.find((stage) => stage.stage === nextStage && stage.unlocked) ??
            stages.find((stage) => stage.stage === lastFight.stage);

        if (!target) {
            closeBattle();

            return;
        }

        fightStage(target);
    }

    /** PA the next chained fight would cost, so the button can say "Brak PA". */
    function nextFightPaCost(): number {
        if (!lastFight) {
            return 0;
        }

        switch (lastFight.kind) {
            case 'arena':
                return arenaPaCost(lastFight.difficulty);
            case 'stage':
                return battleLocation?.pa ?? 1;
            case 'tough':
                return selectedLocation?.pa ?? 1;
        }
    }

    function closeBattle(): void {
        setRemainingFights(null);
        setBattleResult(null);
        setLastFight(null);
        setBattleLocationId(null);
        setView('map');
        setSelectedLocationId(null);
        void store.flush().catch(() => {
            // Reported through the store's lastError.
        });
    }

    function selectWorldMap(worldMap: WorldMapPin): void {
        void run(async () => {
            await store.selectMap(worldMap.id);
            setView('map');
            setSelectedLocationId(null);
            await store.flush();
        });
    }

    function useInventoryItem(index: number): void {
        const item = user.inventory[index];

        if (!item) {
            return;
        }

        void run(async () => {
            if (item.type === 'potion' || item.itemType === 'potion') {
                await store.usePotion(index);
            } else {
                await store.equipItem(index);
            }
        });
    }

    function buyItem(item: Item): void {
        if (!shopId || user.gold < item.price || (item.level ?? 1) > user.level) {
            return;
        }

        void run(() => store.buyItem(shopId, item.shopItemId ?? item.id));
    }

    function buyPa(amount: number): void {
        void run(async () => {
            await store.buyPa(amount);
            setShowPaShop(false);
        });
    }

    const canContinueBattle =
        battleResult?.won === true &&
        lastFight !== null &&
        remainingFights !== null &&
        remainingFights > 0;

    // Shown but disabled when PA ran out, so the run ends visibly rather than
    // by the button quietly disappearing.
    const continueBlockedByPa = canContinueBattle && user.pa < nextFightPaCost();

    return (
        <div id="game-container">
            <GameTopBar active="game" onSettings={() => setShowSettings(true)} />

            <div id="main-content">
                <PlayerSidebar
                    user={user}
                    actionPointFlash={actionPointFlash}
                    onOpenPaShop={() => setShowPaShop(true)}
                    onAddAttribute={(attribute: PlayerAttributeKey) => void run(() => store.addAttribute(attribute))}
                    onUnequip={(slot: EquipmentSlot) => void run(() => store.unequipItem(slot))}
                    onUseInventoryItem={useInventoryItem}
                    onSellInventoryItem={(index) => void run(() => store.sellItem(index))}
                    onShowTooltip={tooltip.show}
                    onHideTooltip={tooltip.hide}
                />

                <main id="map-area">
                    {view === 'map' && (
                        <MapView
                            map={snapshot.currentMap}
                            user={user}
                            selectedLocation={selectedLocation}
                            onSelectLocation={(location) => setSelectedLocationId(location.id)}
                            onEnterLocation={confirmEnterLocation}
                        />
                    )}

                    {view === 'battleSelection' && battleLocation && (
                        <BattleSelectionView
                            location={battleLocation}
                            onSelectStage={fightStage}
                            onBack={goBackToMap}
                        />
                    )}

                    {view === 'toughenemy' && (
                        <ToughEnemyView
                            map={snapshot.currentMap}
                            location={selectedLocation}
                            onFight={startToughFight}
                            onBack={goBackToMap}
                        />
                    )}

                    {view === 'arena' && (
                        <ArenaView
                            map={snapshot.currentMap}
                            location={selectedLocation}
                            onFight={startArenaFight}
                            onBack={goBackToMap}
                        />
                    )}

                    {view === 'battle' && battleResult && (
                        <BattleView
                            battle={battleResult}
                            location={selectedLocation}
                            remainingFights={remainingFights}
                            canContinue={canContinueBattle}
                            continueDisabled={continueBlockedByPa}
                            onContinue={continueBattle}
                            onClose={closeBattle}
                        />
                    )}

                    {view === 'shop' && (
                        <ShopView
                            shop={shopId ? (snapshot.shops[shopId] ?? null) : null}
                            location={selectedLocation}
                            user={user}
                            onBuy={buyItem}
                            onSell={(index) => void run(() => store.sellItem(index))}
                            onSellAll={() => void run(() => store.sellAllItems())}
                            onShowTooltip={tooltip.show}
                            onHideTooltip={tooltip.hide}
                            onBack={goBackToMap}
                        />
                    )}

                    {view === 'rest' && (
                        <RestView
                            rest={snapshot.rest}
                            location={selectedLocation}
                            user={user}
                            onRest={(minutes) => void run(() => store.rest(minutes))}
                            onInstantRest={() => void run(() => store.instantRest())}
                            onBack={goBackToMap}
                        />
                    )}

                    {view === 'worldMap' && (
                        <WorldMapView
                            worldMaps={snapshot.worldMaps}
                            onSelect={selectWorldMap}
                            onBack={goBackToMap}
                        />
                    )}
                </main>
            </div>

            {showPaShop && (
                <Modal onClose={() => setShowPaShop(false)} className="pa-shop">
                    <h2>Sklep z PA</h2>
                    <div className="shop-items">
                        {snapshot.paOffers.map((offer) => (
                            <div
                                key={offer.amount}
                                className={`shop-item${user.gold < offer.price ? ' cant-afford' : ''}`}
                                onClick={() => buyPa(offer.amount)}
                            >
                                <span className="item-name">
                                    {PA_OFFER_NAMES[offer.amount] ?? `${offer.amount} PA`}
                                </span>
                                <span className="item-bonus">+{offer.amount} PA</span>
                                <span className="item-price">💰 {offer.price}</span>
                            </div>
                        ))}
                    </div>
                    <button className="btn-close" type="button" onClick={() => setShowPaShop(false)}>
                        Zamknij
                    </button>
                </Modal>
            )}

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

            {alertMessage && (
                <Modal onClose={() => setAlertMessage('')} className="settings-modal">
                    <h2>Alert</h2>
                    <p>{alertMessage}</p>
                    <button className="btn-close" type="button" onClick={() => setAlertMessage('')}>
                        OK
                    </button>
                </Modal>
            )}

            <footer id="game-footer" />

            <ItemTooltip anchor={tooltip.anchor} />
        </div>
    );
}
