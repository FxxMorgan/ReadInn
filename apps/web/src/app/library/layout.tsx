import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mi biblioteca', robots: { index: false, follow: false } };

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
