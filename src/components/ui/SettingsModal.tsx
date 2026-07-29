'use client';

import { useState } from 'react';

import Modal from './Modal';

export type GameSettings = {
    sound: boolean;
    music: boolean;
    notifications: boolean;
};

const DEFAULT_SETTINGS: GameSettings = { sound: true, music: false, notifications: true };

/**
 * Cosmetic settings panel carried over from the Vue build — the toggles are not
 * wired to anything yet, exactly as before.
 */
export default function SettingsModal({ onClose }: { onClose: () => void }) {
    const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

    const toggle = (key: keyof GameSettings) => (event: React.ChangeEvent<HTMLInputElement>) =>
        setSettings((current) => ({ ...current, [key]: event.target.checked }));

    return (
        <Modal onClose={onClose} className="settings-modal">
            <h2>Ustawienia</h2>
            <div className="setting-row">
                <label htmlFor="setting-sound">Dźwięki</label>
                <input id="setting-sound" type="checkbox" checked={settings.sound} onChange={toggle('sound')} />
            </div>
            <div className="setting-row">
                <label htmlFor="setting-music">Muzyka</label>
                <input id="setting-music" type="checkbox" checked={settings.music} onChange={toggle('music')} />
            </div>
            <div className="setting-row">
                <label htmlFor="setting-notifications">Powiadomienia</label>
                <input
                    id="setting-notifications"
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={toggle('notifications')}
                />
            </div>
            <button className="btn-close" type="button" onClick={onClose}>
                Zamknij
            </button>
        </Modal>
    );
}
