import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'IDEALAB MEC',
    short_name: 'IDEALAB',
    description: 'Explore the IDEA Lab at Model Engineering College.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f4f3ed',
    theme_color: '#111111',
    icons: [
      { src: '/brand/app-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/app-icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/brand/app-icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
