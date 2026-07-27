import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:38479'
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  const origin = `${protocol}://${host}`

  return {
    name: 'Server Gallery',
    short_name: 'Server Gallery',
    description: 'Media Gallery Server',
    start_url: `${origin}/dashboard`,
    scope: `${origin}/`,
    id: '/dashboard',
    display: 'standalone',
    orientation: 'any',
    background_color: '#09090b',
    theme_color: '#09090b',
    categories: ['photo', 'video', 'utilities'],
    icons: [
      {
        src: `${origin}/icon`,
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: `${origin}/icon`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${origin}/icon`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}