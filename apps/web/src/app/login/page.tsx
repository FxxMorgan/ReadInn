'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      if (mode === 'login') await auth.login(String(data.get('email')), String(data.get('password')));
      else await auth.register({ email: String(data.get('email')), username: String(data.get('username')), password: String(data.get('password')), displayName: String(data.get('displayName') || '') });
      const next = new URLSearchParams(window.location.search).get('next');
      router.push(next?.startsWith('/') ? next : '/studio');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos completar el acceso.'); }
    finally { setBusy(false); }
  }

  return (
    <form className="form-panel" onSubmit={submit}>
      <span className="eyebrow">ReadInn</span><h1>{mode === 'login' ? 'Volver a tu refugio' : 'Crear una cuenta'}</h1><p>{mode === 'login' ? 'Continua leyendo o escribiendo donde quedaste.' : 'Empieza tu biblioteca y publica tus propias historias.'}</p>
      {error && <div className="form-error">{error}</div>}
      <div className="field"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" required /></div>
      {mode === 'register' && <><div className="field"><label htmlFor="username">Nombre de usuario</label><input id="username" name="username" minLength={3} pattern="[A-Za-z0-9_-]+" required /></div><div className="field"><label htmlFor="displayName">Nombre publico</label><input id="displayName" name="displayName" /></div></>}
      <div className="field"><label htmlFor="password">Contrasena</label><input id="password" name="password" type="password" minLength={6} required /></div>
      <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Procesando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
      <div className="form-toggle"><span>{mode === 'login' ? 'No tienes cuenta?' : 'Ya tienes cuenta?'}</span><button type="button" onClick={() => { setError(''); setMode(mode === 'login' ? 'register' : 'login'); }}>{mode === 'login' ? 'Registrate' : 'Ingresa'}</button></div>
    </form>
  );
}
