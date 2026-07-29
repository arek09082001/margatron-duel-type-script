'use client';

import { useRouter } from 'next/navigation';

import { APP_VERSION } from '@/game/config';
import { useGameStore } from '@/store/gameStore';

type GameTopBarProps = {
    active?: 'game' | 'rankings' | 'achievements';
    onSettings: () => void;
};

export default function GameTopBar({ active = 'game', onSettings }: GameTopBarProps) {
    const router = useRouter();
    const logout = useGameStore((state) => state.logout);

    async function handleLogout(): Promise<void> {
        await logout();
        router.push('/');
    }

    return (
        <header id="top-bar">
            <div id="logo-container">
                <span className="version">v.{APP_VERSION}</span>
            </div>

            <nav id="top-nav">
                <button className="nav-btn" type="button" disabled>
                    FORUM
                </button>
                <button
                    className={`nav-btn${active === 'rankings' ? ' active' : ''}`}
                    type="button"
                    onClick={() => router.push('/rankings')}
                >
                    RANKINGI
                </button>
                <button
                    className={`nav-btn${active === 'achievements' ? ' active' : ''}`}
                    type="button"
                    onClick={() => router.push('/achievements')}
                >
                    OSIĄGNIĘCIA
                </button>
                <button className="nav-btn" type="button" onClick={onSettings}>
                    KONFIGURACJA
                </button>
                <button className="nav-btn logout" type="button" onClick={() => void handleLogout()}>
                    WYLOGUJ
                </button>
            </nav>
        </header>
    );
}
