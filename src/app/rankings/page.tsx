'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import GameTopBar from '@/components/game/GameTopBar';
import PlayerSidebar from '@/components/game/PlayerSidebar';
import SettingsModal from '@/components/ui/SettingsModal';
import { formatNumber } from '@/lib/format';
import { useRequireCharacter } from '@/lib/useRequireCharacter';
import { useGameClock, useRanking, useSnapshot } from '@/store/hooks';

const SORT_BUTTONS = [
    { key: 'score', label: 'Score', disabled: true },
    { key: 'level', label: 'Level', disabled: false },
    { key: 'pve', label: 'PvE', disabled: true },
    { key: 'pvp', label: 'PvP', disabled: true },
    { key: 'progress', label: 'Progress', disabled: true },
] as const;

export default function RankingsPage() {
    const router = useRouter();
    const { ready } = useRequireCharacter();
    const snapshot = useSnapshot();
    const ranking = useRanking();
    const [showSettings, setShowSettings] = useState(false);

    useGameClock();

    if (!ready || !snapshot || !ranking) {
        return <div className="loading-screen">Wczytywanie rankingu…</div>;
    }

    return (
        <div id="game-container">
            <GameTopBar active="rankings" onSettings={() => setShowSettings(true)} />

            <div id="main-content">
                <PlayerSidebar user={snapshot.user} readOnly />

                <main id="map-area">
                    <div className="rankings-view">
                        <div className="ranking-board">
                            <div className="ranking-tabs" aria-label="Sortowanie rankingu">
                                {SORT_BUTTONS.map((button) => (
                                    <button
                                        key={button.key}
                                        className={`ranking-tab${button.key === ranking.activeSort ? ' active' : ''}`}
                                        type="button"
                                        disabled={button.disabled}
                                    >
                                        {button.label}
                                    </button>
                                ))}
                            </div>

                            <table className="ranking-table">
                                <thead>
                                    <tr>
                                        <th>No.</th>
                                        <th>Name</th>
                                        <th>Lvl</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ranking.entries.map((entry) => (
                                        <tr key={entry.profileId} className={entry.currentUser ? 'current' : undefined}>
                                            <td>{entry.position}</td>
                                            <td>{entry.nick}</td>
                                            <td>{entry.level}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="ranking-controls">
                                <button type="button" disabled>
                                    Top 20
                                </button>
                                <button type="button" disabled>
                                    Dalej
                                </button>
                                <button type="button" disabled>
                                    Wstecz
                                </button>
                                <button type="button" disabled>
                                    Pokaż mnie
                                </button>
                                <label>
                                    Search:
                                    <input type="text" disabled />
                                </label>
                            </div>
                        </div>

                        <aside className="ranking-summary">
                            <div className="ranking-position-box">
                                <span>Your ladder position:</span>
                                <strong>{formatNumber(ranking.currentPosition)}</strong>
                            </div>

                            <p>Ranking jest teraz sortowany po poziomie postaci.</p>
                            <p>
                                To ranking lokalny — obejmuje postacie zapisane w tej przeglądarce. Globalna
                                tabela pojawi się po podłączeniu Supabase.
                            </p>
                        </aside>

                        <button className="ranking-close" type="button" onClick={() => router.push('/game')}>
                            Zamknij
                        </button>
                    </div>
                </main>
            </div>

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

            <footer id="game-footer" />
        </div>
    );
}
