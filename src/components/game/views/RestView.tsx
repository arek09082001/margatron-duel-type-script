'use client';

import type { DecoratedLocation, PlayerView, RestState } from '@/game/types';
import { formatCountdown, formatNumber } from '@/lib/format';
import { useNow } from '@/store/hooks';

type RestViewProps = {
    rest: RestState;
    location: DecoratedLocation | null;
    user: PlayerView;
    onRest: (minutes: number) => void;
    onInstantRest: () => void;
    onBack: () => void;
};

export default function RestView({
    rest,
    location,
    user,
    onRest,
    onInstantRest,
    onBack,
}: RestViewProps) {
    const now = useNow();

    return (
        <div className="inline-view rest-inline">
            <div className="inline-header">Odpoczynek</div>
            <div
                className="rest-content"
                style={{
                    backgroundImage: `url(${location?.imageUrl ?? ''})`,
                    backgroundPositionY: '60%',
                    backgroundSize: '100%',
                }}
            >
                <p className="rest-description">Odpocznij, aby zregenerować PA szybciej.</p>
                <div className="rest-options">
                    {rest.options.map((option) => {
                        const remainingSeconds = option.endsAt
                            ? Math.max(0, Math.ceil((option.endsAt - now) / 1000))
                            : 0;
                        const active = remainingSeconds > 0;

                        return (
                            <button
                                key={option.minutes}
                                className={`rest-option${active ? ' active' : ''}`}
                                type="button"
                                disabled={active}
                                onClick={() => onRest(option.minutes)}
                            >
                                <span className="rest-time">
                                    {option.minutes} {option.minutes === 1 ? 'minuta' : 'minut'}
                                </span>
                                <span className="rest-bonus">+{option.actionPoints} PA</span>
                                <span className="rest-countdown">
                                    {active
                                        ? `Odbiór za ${formatCountdown(remainingSeconds)}`
                                        : 'Rozpocznij'}
                                </span>
                            </button>
                        );
                    })}

                    <button
                        className="rest-option premium"
                        type="button"
                        disabled={user.gold < rest.instant.goldPrice}
                        onClick={onInstantRest}
                    >
                        <span className="rest-time">Natychmiast</span>
                        <span className="rest-bonus">Pełne PA do {rest.instant.targetActionPoints}</span>
                        <span className="rest-price">💰 {formatNumber(rest.instant.goldPrice)}</span>
                    </button>
                </div>
            </div>
            <div className="inline-footer">
                <button className="btn-back" type="button" onClick={onBack}>
                    ← Powrót
                </button>
            </div>
        </div>
    );
}
