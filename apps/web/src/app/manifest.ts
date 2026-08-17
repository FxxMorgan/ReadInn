import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ReadInn: Tu Refugio de Lectura',
    short_name: 'ReadInn',
    description: 'Descubre, lee y publica historias desde cualquier dispositivo.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fffdf8',
    theme_color: '#8c3f28',
    lang: 'es',
    icons: [{ src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
  };
}
