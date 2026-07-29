'use client';

import { useState } from 'react';

import Modal from '@/components/ui/Modal';
import { sellValue } from '@/game/inventory';
import { groupItemsByType } from '@/lib/itemGroups';
import type { DecoratedLocation, Item, PlayerView, Shop } from '@/game/types';
import { formatNumber, itemImage } from '@/lib/format';

type ShopViewProps = {
    shop: Shop | null;
    location: DecoratedLocation | null;
    user: PlayerView;
    onBuy: (item: Item) => void;
    onSell: (index: number) => void;
    onSellAll: () => void;
    onShowTooltip: (item: Item | null | undefined, event: React.MouseEvent<HTMLElement>) => void;
    onHideTooltip: () => void;
    onBack: () => void;
};

export default function ShopView({
    shop,
    location,
    user,
    onBuy,
    onSell,
    onSellAll,
    onShowTooltip,
    onHideTooltip,
    onBack,
}: ShopViewProps) {
    const [tab, setTab] = useState<'buy' | 'sell'>('buy');
    const [confirmSellAll, setConfirmSellAll] = useState(false);

    // Keep the inventory index so selling addresses the right slot.
    const sellableItems = user.inventory
        .map((item, index) => ({ item, index }))
        .filter((entry): entry is { item: Item; index: number } => entry.item !== null);

    const sellAllTotal = sellableItems.reduce((total, entry) => total + sellValue(entry.item), 0);

    // Weapons, armour and talismans each get their own section, ordered
    // weakest to strongest, so the list is scannable instead of a flat wall.
    const buyGroups = groupItemsByType(shop?.items ?? [], (item) => item);
    const sellGroups = groupItemsByType(sellableItems, (entry) => entry.item);

    return (
        <div className="inline-view shop-inline">
            <div className="inline-header">{shop?.name ?? ''}</div>
            <div
                className="shop-main-content"
                style={{
                    backgroundImage: `url(${location?.imageUrl ?? ''})`,
                    backgroundPositionY: '60%',
                    backgroundSize: '100%',
                }}
            >
                <div className="shop-tabs">
                    <button
                        type="button"
                        className={tab === 'buy' ? 'active' : undefined}
                        onClick={() => setTab('buy')}
                    >
                        Kup
                    </button>
                    <button
                        type="button"
                        className={tab === 'sell' ? 'active' : undefined}
                        onClick={() => setTab('sell')}
                    >
                        Sprzedaj
                    </button>
                </div>

                {tab === 'buy' && (
                    <div className="shop-items-list">
                        {buyGroups.map((group) => (
                            <div key={group.type} className="shop-group">
                                <div className="shop-group-header">{group.label}</div>
                                {group.entries.map((item) => {
                                    const cantAfford = user.gold < item.price;
                                    const cantUse = (item.level ?? 1) > user.level;

                                    return (
                                        <div
                                            key={item.id}
                                            className={`shop-row${cantAfford ? ' cant-afford' : ''}${cantUse ? ' cant-use' : ''}`}
                                            onClick={() => onBuy(item)}
                                            onMouseEnter={(event) => onShowTooltip(item, event)}
                                            onMouseLeave={onHideTooltip}
                                        >
                                            <img
                                                src={itemImage(item)}
                                                alt={item.name}
                                                className="shop-item-image"
                                            />
                                            <span
                                                className={`item-name ${item.rarityCss}`.trim()}
                                                style={{ color: item.rarityColor }}
                                            >
                                                {item.name}
                                            </span>
                                            {(item.level ?? 1) > 1 && (
                                                <span className="item-level">Poz. {item.level}</span>
                                            )}
                                            <span
                                                className={`item-price${cantAfford ? ' no-gold' : ''}`}
                                            >
                                                💰 {item.price}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'sell' && (
                    <>
                        <div className="shop-items-list">
                            {sellGroups.map((group) => (
                                <div key={group.type} className="shop-group">
                                    <div className="shop-group-header">{group.label}</div>
                                    {group.entries.map(({ item, index }) => (
                                        <div
                                            key={`${item.id}-${index}`}
                                            className="shop-row"
                                            onClick={() => onSell(index)}
                                            onMouseEnter={(event) => onShowTooltip(item, event)}
                                            onMouseLeave={onHideTooltip}
                                        >
                                            <img
                                                src={itemImage(item)}
                                                alt={item.name}
                                                className="shop-item-image"
                                            />
                                            <span
                                                className={`item-name ${item.rarityCss}`.trim()}
                                                style={{ color: item.rarityColor }}
                                            >
                                                {item.name}
                                            </span>
                                            {(item.quantity ?? 1) > 1 && (
                                                <span className="item-qty">x{item.quantity}</span>
                                            )}
                                            <span className="item-price sell-price">
                                                💰 {sellValue(item)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                            {sellableItems.length === 0 && (
                                <div className="empty-message">Plecak jest pusty</div>
                            )}
                        </div>

                        {/* Outside the list: it scrolls, and with a full backpack
                            the button would sit below the fold. */}
                        {sellableItems.length > 0 && (
                            <button
                                className="btn-sell-all"
                                type="button"
                                onClick={() => setConfirmSellAll(true)}
                            >
                                Sprzedaj wszystko ({sellableItems.length}) — 💰 {formatNumber(sellAllTotal)}
                            </button>
                        )}
                    </>
                )}

                <div className="shop-gold-bar">
                    Twoje złoto: <span className="gold-amount">{formatNumber(user.gold)}</span>
                </div>
            </div>
            <div className="inline-footer">
                <button className="btn-back" type="button" onClick={onBack}>
                    ← Wyjdź ze sklepu
                </button>
            </div>

            {confirmSellAll && (
                <Modal onClose={() => setConfirmSellAll(false)} className="settings-modal">
                    <h2>Sprzedać wszystko?</h2>
                    <p>
                        Sprzedasz {sellableItems.length} przedmiot(ów) za{' '}
                        <strong>{formatNumber(sellAllTotal)}</strong> złota. Tej operacji nie da się cofnąć.
                    </p>
                    <p>Założony ekwipunek zostaje nietknięty.</p>
                    <div className="confirm-buttons">
                        <button
                            className="btn-close"
                            type="button"
                            onClick={() => {
                                onSellAll();
                                setConfirmSellAll(false);
                            }}
                        >
                            Sprzedaj
                        </button>
                        <button className="btn-close" type="button" onClick={() => setConfirmSellAll(false)}>
                            Anuluj
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
