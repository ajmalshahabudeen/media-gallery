import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Server Gallery',
    short_name: 'Server Gallery',
    description: 'Media Gallery Server',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#09090b',
    theme_color: '#09090b',
    categories: ['photo', 'video', 'utilities'],
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}