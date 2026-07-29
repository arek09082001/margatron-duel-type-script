import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    reactStrictMode: true,
    // The legacy pixel-art assets live in `public/game-assets` and are referenced
    // by plain <img> tags / CSS backgrounds, so next/image optimisation is unused.
};

export default nextConfig;
