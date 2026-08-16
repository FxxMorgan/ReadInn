'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { apiFetch } from '@/lib/api';

export default function ProfilePage() {
  const { user, loading, refresh } = useAuth(); const [message, setMessage] = useState('');
  useEffect(() => setMessage(''), [user]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); await apiFetch('/v1/auth/me', { method: 'PATCH', body: JSON.stringify({ displayName: data.get('displayName'), bio: data.get('bio') }) }); await refresh(); setMessage('Perfil actualizado.'); }
  if (!loading && !user) return <div className="page"><div className="empty-state">Ingresa para administrar tu perfil.</div></div>;
  if (!user) return <div className="page"><div className="empty-state">Cargando perfil...</div></div>;
  return <div className="page"><form className="profile-panel" onSubmit={submit}><div className="profile-avatar">{user.displayName.slice(0,1).toUpperCase()}</div><div><span className="eyebrow">@{user.username}</span><h1>Tu perfil</h1><Link className="profile-public-link" href={`/users/${user.username}`}>Ver perfil publico</Link></div><div className="field"><label htmlFor="displayName">Nombre publico</label><input id="displayName" name="displayName" defaultValue={user.displayName} required /></div><div className="field"><label htmlFor="bio">Biografia</label><textarea id="bio" name="bio" defaultValue={user.bio ?? ''} maxLength={500} /></div>{message && <p className="success-message">{message}</p>}<button className="primary-button">Guardar cambios</button></form></div>;
}
