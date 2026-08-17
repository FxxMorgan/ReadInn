import type { Metadata } from 'next';
import { AuthProvider } from '@/components/auth-provider';
import { AppShell } from '@/components/app-shell';
import { OfflineRegister } from '@/components/offline-register';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'ReadInn', template: '%s | ReadInn' },
  description: 'ReadInn: Tu Refugio de Lectura',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://readinn.cypher.cl'),
  applicationName: 'ReadInn',
  creator: 'ReadInn',
  publisher: 'ReadInn',
  keywords: ['novelas', 'lectura', 'historias', 'escritores', 'biblioteca digital'],
  openGraph: { type: 'website', siteName: 'ReadInn', locale: 'es_CL', title: 'ReadInn', description: 'Tu refugio de lectura para descubrir y publicar historias.', images: [{ url: '/logo.png', alt: 'ReadInn' }] },
  twitter: { card: 'summary_large_image', title: 'ReadInn', description: 'Tu refugio de lectura para descubrir y publicar historias.', images: ['/logo.png'] },
  icons: { icon: '/logo.png', apple: '/logo.png' },
  manifest: '/manifest.webmanifest',
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org', '@type': 'WebSite', name: 'ReadInn',
          url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://readinn.cypher.cl',
          description: 'Tu refugio de lectura para descubrir y publicar historias.',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://readinn.cypher.cl'}/?query={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        }).replace(/</g, '\\u003c') }} />
        <OfflineRegister />
        <AuthProvider><AppShell>{children}</AppShell></AuthProvider>
      </body>
    </html>
  );
}
