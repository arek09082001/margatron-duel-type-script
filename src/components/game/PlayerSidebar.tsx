'use client';

import { INVENTORY_SIZE } from '@/game/config';
import type { EquipmentSlot, Item, PlayerAttributeKey, PlayerView } from '@/game/types';
import { formatNumber, itemImage } from '@/lib/format';

const EQUIPMENT_SLOTS: EquipmentSlot[] = ['weapon', 'armor', 'accessory'];

type PlayerSidebarProps = {
    user: PlayerView;
    actionPointFlash?: boolean;
    readOnly?: boolean;
    onOpenPaShop?: () => void;
    onAddAttribute?: (attribute: PlayerAttributeKey) => void;
    onUnequip?: (slot: EquipmentSlot) => void;
    onUseInventoryItem?: (index: number) => void;
    onSellInventoryItem?: (index: number) => void;
    onShowTooltip?: (item: Item | null | undefined, event: React.MouseEvent<HTMLElement>) => void;
    onHideTooltip?: () => void;
};

export default function PlayerSidebar({
    user,
    actionPointFlash = false,
    readOnly = false,
    onOpenPaShop,
    onAddAttribute,
    onUnequip,
    onUseInventoryItem,
    onSellInventoryItem,
    onShowTooltip,
    onHideTooltip,
}: PlayerSidebarProps) {
    const expPercent = user.expMax > 0 ? (user.exp / user.expMax) * 100 : 0;
    const showAttributeButtons = !readOnly && user.attributePoints > 0;

    return (
        <aside id="left-panel" className={readOnly ? 'read-only' : undefined}>
            <div className="panel-section level-section">
                <div className="section-label">
                    POZIOM: <span className="white-val">{user.level}</span>
                </div>
                <div className="exp-bar-container" title={`EXP: ${user.exp} / ${user.expMax}`}>
                    <div className="exp-fill" style={{ width: `${expPercent}%` }} />
                </div>
            </div>

            <div className="panel-section resources-section">
                <div className="res-row">
                    <span className="label">ZŁOTO:</span>
                    <span className="val gold">{formatNumber(user.gold)}</span>
                </div>
                <div className={`res-row action-points-row${actionPointFlash ? ' pa-flash' : ''}`}>
                    <span className="label">PUNKTY AKCJI:</span>
                    <span className="val">{user.pa}</span>
                </div>
                <button className="btn-more-pa" type="button" disabled={readOnly} onClick={onOpenPaShop}>
                    WIĘCEJ PA
                </button>
            </div>

            <div className="panel-section attributes-section">
                <div className="attr-row">
                    <span className="label">WITALNOŚĆ:</span>
                    <span className="val">{user.vitality}</span>
                    {showAttributeButtons && (
                        <button
                            className="btn-plus-small"
                            type="button"
                            onClick={() => onAddAttribute?.('vitality')}
                        >
                            +
                        </button>
                    )}
                </div>
                <div className="attr-row">
                    <span className="label">SIŁA:</span>
                    <span className="val">{user.strength}</span>
                    {showAttributeButtons && (
                        <button
                            className="btn-plus-small"
                            type="button"
                            onClick={() => onAddAttribute?.('strength')}
                        >
                            +
                        </button>
                    )}
                </div>
                <div className="attr-row">
                    <span className="label">SZCZĘŚCIE:</span>
                    <span className="val">{user.luck}</span>
                    {showAttributeButtons && (
                        <button className="btn-plus-small" type="button" onClick={() => onAddAttribute?.('luck')}>
                            +
                        </button>
                    )}
                </div>
            </div>

            <div className="panel-section stats-section">
                <div className="section-header">STATYSTYKI</div>
                <div className="stat-row">
                    <span className="label">Obrażenia:</span>
                    <span className="val">
                        {user.dmgMin}-{user.dmgMax}
                    </span>
                </div>
                <div className="stat-row">
                    <span className="label">Punkty życia:</span>
                    <span className="val hp">{user.hp}</span>
                </div>
                <div className="stat-row">
                    <span className="label">Pancerz:</span>
                    <span className="val">{user.armor}</span>
                </div>
                <div className="stat-row">
                    <span className="label">Cios kryt.:</span>
                    <span className="val">{user.critChance}%</span>
                </div>
                <div className="stat-row">
                    <span className="label">Moc krytyka:</span>
                    <span className="val">{user.critPower}%</span>
                </div>
                <div className="stat-row">
                    <span className="label">Unik:</span>
                    <span className="val">{user.dodge}%</span>
                </div>
                <div className="stat-row">
                    <span className="label">Ogłuszenie:</span>
                    <span className="val">{user.stun}%</span>
                </div>
            </div>

            <div className="panel-section equipment-section">
                <div className="equip-grid">
                    {EQUIPMENT_SLOTS.map((slot) => {
                        const item = user.equipped[slot];

                        return (
                            <div
                                key={slot}
                                className={`eq-slot${item?.rarityCss ? ` ${item.rarityCss}` : ''}`}
                                onClick={() => !readOnly && onUnequip?.(slot)}
                                onMouseEnter={(event) => onShowTooltip?.(item, event)}
                                onMouseLeave={() => onHideTooltip?.()}
                            >
                                {item ? (
                                    <img src={itemImage(item)} alt={item.name} className="item-image" />
                                ) : (
                                    <span className="slot-bg" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="panel-section inventory-section">
                <div className="inv-grid-classic">
                    {Array.from({ length: INVENTORY_SIZE }, (_, index) => {
                        const item = user.inventory[index];

                        return (
                            <div
                                key={index}
                                className={`inv-cell${item?.rarityCss ? ` ${item.rarityCss}` : ''}`}
                                onClick={() => !readOnly && onUseInventoryItem?.(index)}
                                onContextMenu={(event) => {
                                    event.preventDefault();

                                    if (!readOnly) {
                                        onSellInventoryItem?.(index);
                                    }
                                }}
                                onMouseEnter={(event) => onShowTooltip?.(item, event)}
                                onMouseLeave={() => onHideTooltip?.()}
                            >
                                {item && <img src={itemImage(item)} alt={item.name} className="item-image" />}
                                {(item?.quantity ?? 1) > 1 && <span className="qty">{item?.quantity}</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            <button className="btn-chat-classic" type="button" disabled>
                CHAT
            </button>
        </aside>
    );
}
