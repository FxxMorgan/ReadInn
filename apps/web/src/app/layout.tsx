import type { Metadata } from 'next';
import { AuthProvider } from '@/components/auth-provider';
import { AppShell } from '@/components/app-shell';
import { OfflineRegister } from '@/components/offline-register';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'ReadInn', template: '%s | ReadInn' },
  description: 'ReadInn: Tu Refugio de Lectura',
  icons: { icon: '/logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <OfflineRegister />
        <AuthProvider><AppShell>{children}</AppShell></AuthProvider>
      </body>
    </html>
  );
}
