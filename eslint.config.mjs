import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
    baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

export default [
    {
        ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
    },
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        rules: {
            // The game renders pixel-art sprites from `public/game-assets` at their
            // native size; next/image would rescale and blur them.
            '@next/next/no-img-element': 'off',
        },
    },
];
