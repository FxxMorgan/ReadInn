'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { apiFetch, apiUrl } from '@/lib/api';

export default function ProfilePage() {
  const { user, loading, refresh } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => setMessage(''), [user]);
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  function selectAvatar(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('La foto debe ser JPG, PNG, WebP o GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La foto no puede pesar mas de 5 MB.');
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setError('');
    setRemoveAvatar(false);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function uploadAvatar(file: File): Promise<string> {
    const intent = await apiFetch<{ mediaId: string; uploadPath: string }>('/v1/media/upload-intent', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, mimeType: file.type, sizeBytes: file.size, purpose: 'avatar' }),
    });
    const upload = await fetch(apiUrl(intent.uploadPath), {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!upload.ok) throw new Error('No pudimos subir la foto de perfil.');
    const confirmed = await apiFetch<{ publicUrl: string }>(`/v1/media/${intent.mediaId}/confirm`, { method: 'POST' });
    return confirmed.publicUrl;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const data = new FormData(event.currentTarget);
      const avatarUrl = removeAvatar ? null : avatarFile ? await uploadAvatar(avatarFile) : user.avatarUrl ?? null;
      await apiFetch('/v1/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: data.get('displayName'), bio: data.get('bio'), avatarUrl }),
      });
      await refresh();
      setAvatarFile(null);
      setAvatarPreview(null);
      setRemoveAvatar(false);
      setMessage('Perfil actualizado.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  }

  if (!loading && !user) return <div className="page"><div className="empty-state">Ingresa para administrar tu perfil.</div></div>;
  if (!user) return <div className="page"><div className="empty-state">Cargando perfil...</div></div>;

  const visibleAvatar = avatarPreview ?? (!removeAvatar ? user.avatarUrl : null);
  return (
    <div className="page">
      <form className="profile-panel" onSubmit={submit}>
        <div className="profile-avatar-picker">
          <button type="button" className="profile-avatar" title="Cambiar foto" onClick={() => avatarInput.current?.click()}>
            {visibleAvatar ? <img src={visibleAvatar} alt="Foto de perfil" /> : user.displayName.slice(0, 1).toUpperCase()}
            <span><Camera size={15} /></span>
          </button>
          <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => { selectAvatar(event.target.files?.[0]); event.target.value = ''; }} />
          {(visibleAvatar || user.avatarUrl) && (
            <button type="button" className="avatar-remove" title="Quitar foto" onClick={() => { setAvatarFile(null); setAvatarPreview(null); setRemoveAvatar(true); }}><Trash2 size={16} /></button>
          )}
        </div>
        <div><span className="eyebrow">@{user.username}</span><h1>Tu perfil</h1><Link className="profile-public-link" href={`/users/${user.username}`}>Ver perfil publico</Link></div>
        <div className="field"><label htmlFor="displayName">Nombre publico</label><input id="displayName" name="displayName" defaultValue={user.displayName} required /></div>
        <div className="field"><label htmlFor="bio">Biografia</label><textarea id="bio" name="bio" defaultValue={user.bio ?? ''} maxLength={500} /></div>
        {message && <p className="success-message">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
      </form>
    </div>
  );
}
