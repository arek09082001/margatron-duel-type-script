import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
    baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
    {
        // `src/generated` is the Prisma client, regenerated on every build.
        ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'src/generated/**'],
    },
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        rules: {
            // The game renders pixel-art sprites from `public/game-assets` at their
            // native size; next/image would rescale and blur them.
            '@next/next/no-img-element': 'off',

            // Pages Router rule: it warns that a font <link> outside _document.js
            // loads for a single page only. In the App Router the link lives in the
            // root layout, so it already applies to every route.
            '@next/next/no-page-custom-font': 'off',
        },
    },
];

export default config;
