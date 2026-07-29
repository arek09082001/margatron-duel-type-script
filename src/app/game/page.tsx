'use client';

import { useMemo, useState } from 'react';

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
    const [lastBattleStage, setLastBattleStage] = useState<number | null>(null);
    const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
    const [remainingFights, setRemainingFights] = useState<number | null>(null);
    const [shopId, setShopId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showPaShop, setShowPaShop] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    useGameClock();
    const actionPointFlash = useIncreaseFlash(snapshot?.user.pa ?? null);

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

    /** Runs a store action and surfaces `GameError` messages in the alert modal. */
    function run(action: () => void): void {
        try {
            action();
        } catch (error) {
            setAlertMessage(errorMessage(error));
        }
    }

    function goBackToMap(): void {
        setView('map');
        setSelectedLocationId(null);
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

        run(() => {
            const result = store.fightStage(battleLocationId, stage.stage);

            setRemainingFights((current) => (current ?? EXPEDITION_FIGHTS) - 1);
            setLastBattleStage(stage.stage);
            setBattleResult(result);
            setView('battle');
        });
    }

    function continueBattle(): void {
        if (!battleLocation || lastBattleStage === null) {
            closeBattle();

            return;
        }

        const stages = battleLocation.stages ?? [];
        const nextStage = Math.min(STAGES_PER_LOCATION, lastBattleStage + (battleResult?.won ? 1 : 0));
        const target =
            stages.find((stage) => stage.stage === nextStage && stage.unlocked) ??
            stages.find((stage) => stage.stage === lastBattleStage);

        if (!target) {
            closeBattle();

            return;
        }

        fightStage(target);
    }

    function startArenaFight(difficulty: ArenaDifficultyValue): void {
        run(() => {
            setLastBattleStage(null);
            setRemainingFights(null);
            setBattleResult(store.fightArena(difficulty));
            setView('battle');
        });
    }

    function startToughFight(enemyType: ToughEnemyKind): void {
        if (!selectedLocationId) {
            return;
        }

        run(() => {
            setLastBattleStage(null);
            setRemainingFights(null);
            setBattleResult(store.fightTough(selectedLocationId, enemyType));
            setView('battle');
        });
    }

    function closeBattle(): void {
        setRemainingFights(null);
        setBattleResult(null);
        setLastBattleStage(null);
        setBattleLocationId(null);
        setView('map');
        setSelectedLocationId(null);
    }

    function selectWorldMap(worldMap: WorldMapPin): void {
        run(() => {
            store.selectMap(worldMap.id);
            setView('map');
            setSelectedLocationId(null);
        });
    }

    function useInventoryItem(index: number): void {
        const item = user.inventory[index];

        if (!item) {
            return;
        }

        run(() => {
            if (item.type === 'potion' || item.itemType === 'potion') {
                store.usePotion(index);
            } else {
                store.equipItem(index);
            }
        });
    }

    function buyItem(item: Item): void {
        if (!shopId || user.gold < item.price || (item.level ?? 1) > user.level) {
            return;
        }

        run(() => store.buyItem(shopId, item.shopItemId ?? item.id));
    }

    function buyPa(amount: number): void {
        run(() => {
            store.buyPa(amount);
            setShowPaShop(false);
        });
    }

    const canContinueBattle =
        battleResult?.won === true &&
        lastBattleStage !== null &&
        remainingFights !== null &&
        remainingFights > 0;

    return (
        <div id="game-container">
            <GameTopBar active="game" onSettings={() => setShowSettings(true)} />

            <div id="main-content">
                <PlayerSidebar
                    user={user}
                    actionPointFlash={actionPointFlash}
                    onOpenPaShop={() => setShowPaShop(true)}
                    onAddAttribute={(attribute: PlayerAttributeKey) => run(() => store.addAttribute(attribute))}
                    onUnequip={(slot: EquipmentSlot) => run(() => store.unequipItem(slot))}
                    onUseInventoryItem={useInventoryItem}
                    onSellInventoryItem={(index) => run(() => store.sellItem(index))}
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
                            onSell={(index) => run(() => store.sellItem(index))}
                            onSellAll={() => run(() => store.sellAllItems())}
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
                            onRest={(minutes) => run(() => store.rest(minutes))}
                            onInstantRest={() => run(() => store.instantRest())}
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
