'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Library, LogIn, LogOut, PenLine, Search, UserRound } from 'lucide-react';
import { useAuth } from './auth-provider';

const nav = [
  { href: '/', label: 'Explorar', icon: Search },
  { href: '/library', label: 'Biblioteca', icon: Library },
  { href: '/studio', label: 'Escribir', icon: PenLine },
  { href: '/profile', label: 'Perfil', icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const editorMode = pathname.includes('/chapters/') && pathname.startsWith('/studio/');
  if (editorMode) return <>{children}</>;

  return (
    <div className="app-frame">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="ReadInn inicio">
          <img src="/logo.png" alt="" />
          <span>ReadInn</span>
        </Link>
        <nav className="desktop-nav" aria-label="Navegacion principal">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={pathname === href ? 'active' : ''}>
              <Icon size={17} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        {user ? (
          <button className="icon-command" title="Cerrar sesion" onClick={async () => { await logout(); router.push('/'); }}>
            <LogOut size={19} /><span className="sr-only">Cerrar sesion</span>
          </button>
        ) : (
          <Link className="login-link" href="/login"><LogIn size={17} />Ingresar</Link>
        )}
      </header>
      <main>{children}</main>
      <nav className="mobile-nav" aria-label="Navegacion principal">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={pathname === href ? 'active' : ''}>
            <Icon size={20} /><span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
