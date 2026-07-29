'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import GameTopBar from '@/components/game/GameTopBar';
import PlayerSidebar from '@/components/game/PlayerSidebar';
import SettingsModal from '@/components/ui/SettingsModal';
import { useRequireCharacter } from '@/lib/useRequireCharacter';
import { useAchievements, useGameClock, useSnapshot } from '@/store/hooks';

export default function AchievementsPage() {
    const router = useRouter();
    const { ready } = useRequireCharacter();
    const snapshot = useSnapshot();
    const achievements = useAchievements();
    const [showSettings, setShowSettings] = useState(false);

    useGameClock();

    if (!ready || !snapshot || !achievements) {
        return <div className="loading-screen">Wczytywanie osiągnięć…</div>;
    }

    return (
        <div id="game-container">
            <GameTopBar active="achievements" onSettings={() => setShowSettings(true)} />

            <div id="main-content">
                <PlayerSidebar user={snapshot.user} readOnly />

                <main id="map-area">
                    <div className="achievements-view">
                        <header className="achievements-header">
                            <div>
                                <h1>Osiągnięcia</h1>
                                <p>Postęp całkowity: {achievements.overallPercent}%</p>
                            </div>
                            <button
                                className="achievements-close"
                                type="button"
                                onClick={() => router.push('/game')}
                            >
                                Zamknij
                            </button>
                        </header>

                        <div className="achievements-scroll">
                            {achievements.entries.map((achievement) => (
                                <article
                                    key={achievement.id}
                                    className={`achievement-card${achievement.completed ? ' completed' : ''}`}
                                >
                                    <div className="achievement-body">
                                        <strong>{achievement.label}</strong>
                                        <span>{achievement.progressLabel}</span>
                                        <div className="achievement-progress">
                                            <div style={{ width: `${achievement.percent}%` }} />
                                        </div>
                                    </div>
                                    <div className="achievement-icon">{achievement.icon}</div>
                                </article>
                            ))}
                        </div>
                    </div>
                </main>
            </div>

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

            <footer id="game-footer" />
        </div>
    );
}
