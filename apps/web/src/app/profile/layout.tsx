import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mi perfil', robots: { index: false, follow: false } };

export default function ProfileSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
