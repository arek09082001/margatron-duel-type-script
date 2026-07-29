'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import type { Item } from '@/game/types';
import { bonusRows } from '@/lib/format';

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
 */
export default function ItemTooltip({ anchor }: { anchor: TooltipAnchor | null }) {
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

        setPosition({ x: Math.max(0, x), y });
    }, [anchor]);

    if (!anchor) {
        return null;
    }

    const item = anchor.item;

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
                {item.effect === 'pa' && <i className="idesc">Przywraca {item.effectValue} PA</i>}
                {bonusRows(item).map((stat) => (
                    <i key={stat.key} className="idesc">
                        {stat.name}: {stat.value}
                        {stat.suffix}
                    </i>
                ))}

                <br />
                {(item.level ?? 1) > 1 && <i className="idesc">Wymagany poziom: {item.level}</i>}
                {item.power > 0 && <i className="idesc">Moc przedmiotu: {item.power}</i>}
                <i className="idesc">Wartość: {item.price}</i>
            </div>
        </div>
    );
}
