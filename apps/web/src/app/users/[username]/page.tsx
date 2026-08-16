'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { MessageSquare, UserCheck, UserPlus } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { BookCard } from '@/components/book-card';
import { apiFetch } from '@/lib/api';
import type { PublicProfile, WallPost } from '@/lib/types';

export default function PublicProfilePage({ params }: { params: { username: string } }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [profileData, wallData] = await Promise.all([
        apiFetch<PublicProfile>(`/v1/users/${params.username}`),
        apiFetch<WallPost[]>(`/v1/users/${params.username}/wall`),
      ]);
      setProfile(profileData);
      setPosts(wallData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos cargar el perfil.');
    }
  }, [params.username]);

  useEffect(() => { void load(); }, [load]);

  async function toggleFollow() {
    const result = await apiFetch<{ following: boolean; followerCount: number }>(`/v1/users/${params.username}/follow`, { method: 'POST' });
    setProfile((current) => current ? { ...current, isFollowing: result.following, followerCount: result.followerCount } : current);
  }

  async function postToWall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = String(data.get('body') ?? '').trim();
    if (!body) return;
    setPosting(true);
    try {
      const post = await apiFetch<WallPost>(`/v1/users/${params.username}/wall`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      setPosts((current) => [post, ...current]);
      form.reset();
    } finally {
      setPosting(false);
    }
  }

  if (error) return <div className="page"><div className="error-state">{error}</div></div>;
  if (!profile) return <div className="page"><div className="empty-state">Cargando perfil...</div></div>;
  const ownProfile = user?.username === profile.username;

  return (
    <div className="page public-profile-page">
      <header className="public-profile-header">
        <div className="public-profile-avatar">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : profile.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <span className="eyebrow">@{profile.username}</span>
          <h1>{profile.displayName}</h1>
          <p>{profile.bio || 'Sin biografia.'}</p>
          <div className="profile-counts"><span><strong>{profile.followerCount}</strong> seguidores</span><span><strong>{profile.followingCount}</strong> siguiendo</span></div>
        </div>
        {!ownProfile && (
          user
            ? <button className={profile.isFollowing ? 'secondary-button' : 'primary-button'} onClick={toggleFollow}>{profile.isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}{profile.isFollowing ? 'Siguiendo' : 'Seguir'}</button>
            : <Link className="primary-button" href="/login"><UserPlus size={18} />Seguir</Link>
        )}
      </header>

      <section className="profile-works">
        <div className="section-heading"><h2>Obras publicadas</h2><span>{profile.stories.length}</span></div>
        {profile.stories.length ? <div className="book-grid">{profile.stories.map((story) => <BookCard key={story.id} story={story} />)}</div> : <div className="empty-state">Este usuario aun no ha publicado obras.</div>}
      </section>

      <section className="profile-wall">
        <div className="section-heading"><h2>Muro</h2><MessageSquare size={20} /></div>
        {user ? (
          <form className="wall-composer" onSubmit={postToWall}>
            <textarea name="body" maxLength={1000} required placeholder={`Escribir en el muro de ${profile.displayName}`} />
            <button className="primary-button" disabled={posting}>Publicar</button>
          </form>
        ) : <Link className="wall-login" href="/login">Ingresa para dejar un mensaje.</Link>}
        <div className="wall-posts">
          {posts.length ? posts.map((post) => (
            <article key={post.id}>
              <div className="comment-avatar">{post.authorName.slice(0, 1).toUpperCase()}</div>
              <div><strong><Link href={`/users/${post.authorUsername}`}>{post.authorName}</Link></strong><p>{post.body}</p><time>{new Date(post.createdAt).toLocaleString('es-CL')}</time></div>
            </article>
          )) : <p className="wall-empty">Todavia no hay mensajes.</p>}
        </div>
      </section>
    </div>
  );
}
