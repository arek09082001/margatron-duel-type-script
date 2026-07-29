import type { Metadata, Viewport } from 'next';

import './globals.css';

export const metadata: Metadata = {
    title: {
        default: 'MG Duel',
        template: '%s - MG Duel',
    },
    description: 'Przeglądarkowy RPG-duel inspirowany klasycznym frontendowym prototypem.',
    icons: {
        icon: '/game-assets/favicon.png',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pl">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Mate+SC&display=swap"
                />
            </head>
            <body>
                <div id="app">{children}</div>
            </body>
        </html>
    );
}
