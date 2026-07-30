'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { bagSlots } from '@/game/bags';
import type { Item, PlayerView } from '@/game/types';
import { bonusRows } from '@/lib/format';
import { type ItemComparison, compareWithEquipped, formatDelta } from '@/lib/itemCompare';

const OFFSET = 10;

type TooltipAnchor = {
    item: Item;
    rect: DOMRect;
};

export type ItemTooltipController = {
    anchor: TooltipAnchor | null;
    show: (item: Item | null | undefined, event: React.MouseEvent<HTMLElement>) => void;
    hide: () => void;
};

export function useItemTooltip(): ItemTooltipController {
    const [anchor, setAnchor] = useState<TooltipAnchor | null>(null);

    const show = useCallback((item: Item | null | undefined, event: React.MouseEvent<HTMLElement>) => {
        if (!item) {
            return;
        }

        setAnchor({ item, rect: event.currentTarget.getBoundingClientRect() });
    }, []);

    const hide = useCallback(() => setAnchor(null), []);

    return { anchor, show, hide };
}

/**
 * Item tooltip. Positioning mirrors the Vue original: centred above the hovered
 * cell, flipped below when it would clip the top of the viewport, and clamped
 * against the right edge. Measured after paint so the size is known.
 *
 * `user` is optional so a read-only tooltip can be rendered without one; with a
 * player it also prints how the item stacks up against the worn one.
 */
export default function ItemTooltip({
    anchor,
    user,
}: {
    anchor: TooltipAnchor | null;
    user?: PlayerView | null;
}) {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

    useLayoutEffect(() => {
        if (!anchor || !tooltipRef.current) {
            setPosition(null);

            return;
        }

        const { offsetWidth, offsetHeight } = tooltipRef.current;
        const { rect } = anchor;

        let x = rect.left - (offsetWidth - 32) / 2;
        let y = rect.top - offsetHeight - OFFSET;

        if (y < 0) {
            y = rect.bottom + OFFSET;
        }

        if (x + offsetWidth > window.innerWidth) {
            x = window.innerWidth - offsetWidth - OFFSET;
        }

        // The comparison block makes the tooltip tall enough that flipping it
        // below a cell near the bottom of the backpack would run it off screen.
        const lowestTop = Math.max(0, window.innerHeight - offsetHeight - OFFSET);

        setPosition({ x: Math.max(0, x), y: Math.min(Math.max(0, y), lowestTop) });
    }, [anchor]);

    if (!anchor) {
        return null;
    }

    const item = anchor.item;
    const slots = bagSlots(item);
    const comparison = user ? compareWithEquipped(item, user) : null;

    return (
        <div
            id="tip"
            ref={tooltipRef}
            className="t_item"
            style={{
                left: `${position?.x ?? 0}px`,
                top: `${position?.y ?? 0}px`,
                display: 'block',
                visibility: position ? 'visible' : 'hidden',
            }}
        >
            <div className="tipInnerContainer">
                <b className={item.rarityCss}>{item.name}</b>
                {item.rarity !== 'common' && <i className="rarity">{item.rarityName}</i>}
                <br />
                {item.dmgMin !== undefined && (
                    <i className="idesc">
                        Obrażenia: {item.dmgMin}-{item.dmgMax}
                    </i>
                )}
                {item.armor !== undefined && <i className="idesc">Pancerz: {item.armor}</i>}
                {slots > 0 && <i className="idesc">Miejsca w plecaku: +{slots}</i>}
                {item.effect === 'pa' && <i className="idesc">Przywraca {item.effectValue} PA</i>}
                {bonusRows(item).map((stat) => (
                    <i key={stat.key} className="idesc">
                        {stat.name}: {stat.value}
                        {stat.suffix}
                    </i>
                ))}

                <br />
                {(item.level ?? 1) > 1 && (
                    <i className={`idesc${comparison?.levelLocked ? ' too-high' : ''}`}>
                        Wymagany poziom: {item.level}
                    </i>
                )}
                {/* A bag has no combat power; its slot count says everything. */}
                {item.power > 0 && slots === 0 && <i className="idesc">Moc przedmiotu: {item.power}</i>}
                <i className="idesc">Wartość: {item.price}</i>

                {comparison && <ComparisonBlock comparison={comparison} />}
            </div>
        </div>
    );
}

/**
 * The "should I put this on?" half of the tooltip.
 *
 * Every row reads `worn → hovered` followed by the difference, so a stat that
 * only one of the two carries shows a dash on the other side and says outright
 * whether it is new or about to fall away.
 */
function ComparisonBlock({ comparison }: { comparison: ItemComparison }) {
    if (comparison.wearing) {
        return (
            <div className="tip-compare">
                <div className="cmp-head worn">To masz właśnie założone</div>
            </div>
        );
    }

    const { equipped, rows, powerDelta } = comparison;

    return (
        <div className="tip-compare">
            <div className="cmp-head">
                {equipped ? `Zamiast: ${equipped.name}` : 'Ten slot masz pusty'}
            </div>

            {rows.map((row) => (
                <div key={row.key} className={`cmp-row cmp-${row.state}`}>
                    <span className="cmp-label">
                        {row.label}
                        {row.state === 'lost' && <span className="cmp-tag">przepada</span>}
                        {row.state === 'gained' && <span className="cmp-tag">nowe</span>}
                    </span>
                    <span className="cmp-values">
                        {row.current ?? '—'} → {row.candidate ?? '—'}
                    </span>
                    <span className="cmp-delta">{row.delta}</span>
                </div>
            ))}

            {rows.length === 0 && <div className="cmp-note">Dokładnie te same statystyki</div>}

            {/* A bag's power is nothing but its slots, which the rows already say. */}
            {rows.length > 0 && comparison.slot !== 'bag' && (
                <div className={`cmp-total ${powerDelta > 0 ? 'up' : powerDelta < 0 ? 'down' : 'same'}`}>
                    {powerDelta === 0
                        ? 'Ta sama moc przedmiotu'
                        : `Moc przedmiotu: ${formatDelta(powerDelta)}`}
                </div>
            )}

            {comparison.levelLocked && (
                <div className="cmp-warn">Za wysoki poziom — jeszcze tego nie założysz</div>
            )}
            {comparison.bagTooSmall && (
                <div className="cmp-warn">Za mała — najpierw zrób miejsce w plecaku</div>
            )}
        </div>
    );
}
