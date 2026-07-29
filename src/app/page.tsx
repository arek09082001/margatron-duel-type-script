'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { APP_VERSION } from '@/game/config';
import { errorMessage } from '@/game/errors';
import { useGameStore } from '@/store/gameStore';
import { useCurrentProfile, useHydrated } from '@/store/hooks';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICK_PATTERN = /^[a-z0-9]+$/i;

export default function HomePage() {
    const router = useRouter();
    const hydrated = useHydrated();
    const profile = useCurrentProfile();
    const register = useGameStore((state) => state.register);
    const login = useGameStore((state) => state.login);

    const [nick, setNick] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [processing, setProcessing] = useState(false);
    const [showRecovery, setShowRecovery] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');

    // An already-signed-in character goes straight into the game, like the
    // Laravel `/` route did when the session was authenticated.
    useEffect(() => {
        if (hydrated && profile) {
            router.replace('/game');
        }
    }, [hydrated, profile, router]);

    const nickValid = nick.length >= 4 && NICK_PATTERN.test(nick);
    const emailValid = EMAIL_PATTERN.test(email);
    const passValid = password.length >= 6;
    const pass2Valid = passwordConfirmation.length >= 6 && passwordConfirmation === password;
    const loginEmailValid = EMAIL_PATTERN.test(loginEmail);
    const loginPassValid = loginPassword.length >= 6;

    async function handleRegister(): Promise<void> {
        if (!pass2Valid) {
            setAlertMessage('Hasła nie są identyczne');

            return;
        }

        if (!nickValid || !emailValid || !passValid) {
            setAlertMessage('Wypełnij poprawnie wszystkie pola');

            return;
        }

        setProcessing(true);

        try {
            await register(nick, email, password);
            router.replace('/game');
        } catch (error) {
            setAlertMessage(errorMessage(error));
        } finally {
            setProcessing(false);
        }
    }

    async function handleLogin(): Promise<void> {
        if (!loginEmailValid || !loginPassValid) {
            setAlertMessage('Wypełnij poprawnie wszystkie pola');

            return;
        }

        setProcessing(true);

        try {
            await login(loginEmail, loginPassword);
            router.replace('/game');
        } catch (error) {
            setAlertMessage(errorMessage(error));
        } finally {
            setProcessing(false);
        }
    }

    return (
        <div id="centerbox">
            <header id="logo">
                <div id="ver">v. {APP_VERSION}</div>
            </header>

            {alertMessage && (
                <div id="alert" onClick={() => setAlertMessage('')}>
                    <div id="box">
                        <header>Alert</header>
                        <section>{alertMessage}</section>
                        <button type="button" onClick={() => setAlertMessage('')}>
                            OK
                        </button>
                    </div>
                </div>
            )}

            <div id="content">
                <div id="welcome">
                    <section id="signup">
                        <div className="form-row">
                            <label htmlFor="register-nick">Nick:</label>
                            <input
                                id="register-nick"
                                value={nick}
                                maxLength={20}
                                className={nickValid ? 'good' : undefined}
                                onChange={(event) => setNick(event.target.value)}
                            />
                        </div>

                        <div className="form-row">
                            <label htmlFor="register-email">Email:</label>
                            <input
                                id="register-email"
                                value={email}
                                maxLength={40}
                                className={emailValid ? 'good' : undefined}
                                onChange={(event) => setEmail(event.target.value)}
                            />
                        </div>

                        <div className="form-row">
                            <label htmlFor="register-password">Hasło:</label>
                            <input
                                id="register-password"
                                type="password"
                                value={password}
                                maxLength={20}
                                className={passValid ? 'good' : undefined}
                                onChange={(event) => setPassword(event.target.value)}
                            />
                        </div>

                        <div className="form-row">
                            <label htmlFor="register-password-confirmation">Potwierdź hasło:</label>
                            <input
                                id="register-password-confirmation"
                                type="password"
                                value={passwordConfirmation}
                                maxLength={20}
                                className={pass2Valid ? 'good' : undefined}
                                onChange={(event) => setPasswordConfirmation(event.target.value)}
                            />
                        </div>

                        <button type="button" disabled={processing} onClick={handleRegister}>
                            {processing ? 'Rejestracja...' : 'Załóż konto'}
                        </button>
                    </section>

                    <section id="login">
                        <div className="form-row">
                            <label htmlFor="login-email">Email:</label>
                            <input
                                id="login-email"
                                value={loginEmail}
                                maxLength={40}
                                className={loginEmailValid ? 'good' : undefined}
                                onChange={(event) => setLoginEmail(event.target.value)}
                            />
                        </div>

                        <div className="form-row">
                            <label htmlFor="login-password">Hasło:</label>
                            <input
                                id="login-password"
                                type="password"
                                value={loginPassword}
                                maxLength={20}
                                className={loginPassValid ? 'good' : undefined}
                                onChange={(event) => setLoginPassword(event.target.value)}
                                onKeyUp={(event) => {
                                    if (event.key === 'Enter') {
                                        void handleLogin();
                                    }
                                }}
                            />
                        </div>

                        <button type="button" disabled={processing} onClick={handleLogin}>
                            {processing ? 'Logowanie...' : 'Logowanie'}
                        </button>
                        <small onClick={() => setShowRecovery(true)}>Zapomniałeś hasła?</small>
                    </section>
                </div>

                {showRecovery && (
                    <section id="passrecover">
                        <h2>Odzyskiwanie hasła</h2>
                        <label htmlFor="recovery-email">Email:</label>
                        <input
                            id="recovery-email"
                            value={recoveryEmail}
                            maxLength={40}
                            onChange={(event) => setRecoveryEmail(event.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                // No mail backend yet — Supabase Auth will own this flow.
                                setAlertMessage(
                                    'Odzyskiwanie hasła będzie dostępne po podłączeniu Supabase.',
                                );
                                setShowRecovery(false);
                            }}
                        >
                            Resetuj hasło
                        </button>
                        <button type="button" onClick={() => setShowRecovery(false)}>
                            Anuluj
                        </button>
                    </section>
                )}
            </div>

            <footer>
                &copy; 2026 <a href="#">Pan z Margo</a> | postacie zapisane lokalnie | lang:pl | not logged
            </footer>
        </div>
    );
}
