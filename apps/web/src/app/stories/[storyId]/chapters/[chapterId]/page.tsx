'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookDown, ChevronDown, ChevronUp, Download, Eye, MessageCircle, Reply, Send, Settings2, X } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { apiFetch, apiUrl } from '@/lib/api';
import { getOfflineItem, hasOfflineItem, putOfflineItem } from '@/lib/offline-library';
import type { ChapterComment, ChapterDetail, StoryDetail } from '@/lib/types';

type ReaderTheme = 'light' | 'sepia' | 'dark';
type ReaderFont = 'literary' | 'classic' | 'humanist' | 'accessible' | 'mono';

const fontOptions: Array<{ id: ReaderFont; label: string; family: string }> = [
  { id: 'literary', label: 'Literaria', family: 'Georgia, Cambria, "Times New Roman", serif' },
  { id: 'classic', label: 'Clasica', family: 'Garamond, Baskerville, "Palatino Linotype", serif' },
  { id: 'humanist', label: 'Humanista', family: 'Trebuchet MS, Segoe UI, sans-serif' },
  { id: 'accessible', label: 'Accesible', family: 'Verdana, Tahoma, sans-serif' },
  { id: 'mono', label: 'Mono', family: 'Consolas, "Courier New", monospace' },
];

const themeOptions: Record<ReaderTheme, { background: string; text: string; muted: string }> = {
  light: { background: '#fffdf8', text: '#29231f', muted: '#746b64' },
  sepia: { background: '#fff4df', text: '#4d3525', muted: '#7a5638' },
  dark: { background: '#171717', text: '#f5f2ed', muted: '#aaa39c' },
};

function paragraphs(content: unknown): string[] {
  if (Array.isArray(content)) return content.flatMap((item) => paragraphs(item));
  if (typeof content === 'string') return content.split(/\r?\n\s*\r?\n|\r?\n/).map((item) => item.trim()).filter(Boolean);
  if (content && typeof content === 'object' && 'content' in content) {
    const nodes = (content as { content?: unknown[] }).content ?? [];
    return nodes.flatMap((node) => paragraphs(node));
  }
  if (content && typeof content === 'object' && 'text' in content) return [String((content as { text?: unknown }).text ?? '')].filter(Boolean);
  return [];
}

export default function ReaderPage({ params }: { params: { storyId: string; chapterId: string } }) {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [comments, setComments] = useState<ChapterComment[]>([]);
  const [activeParagraph, setActiveParagraph] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [font, setFont] = useState<ReaderFont>('literary');
  const [fontSize, setFontSize] = useState(20);
  const [theme, setTheme] = useState<ReaderTheme>('light');
  const [showHiddenComments, setShowHiddenComments] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [accessError, setAccessError] = useState('');

  const chapterCacheKey = `readinn-offline-chapter:${params.storyId}:${params.chapterId}`;
  const commentsCacheKey = `readinn-offline-comments:${params.storyId}:${params.chapterId}`;

  const loadComments = useCallback(async (includeHidden = false, signal?: AbortSignal) => {
    try {
      const loaded = await apiFetch<ChapterComment[]>(
        `/v1/stories/${params.storyId}/chapters/${params.chapterId}/comments?includeHidden=${includeHidden}`,
        { signal },
      );
      if (signal?.aborted) return;
      setComments(loaded);
      await putOfflineItem(commentsCacheKey, loaded);
    } catch {
      if (signal?.aborted) return;
      const cached = await getOfflineItem<ChapterComment[]>(commentsCacheKey);
      if (cached) setComments(cached);
    }
  }, [commentsCacheKey, params.chapterId, params.storyId]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    async function loadProtectedChapter() {
      void hasOfflineItem(chapterCacheKey).then((saved) => {
        if (!cancelled) setOfflineSaved(saved);
      });
      try {
        const story = await apiFetch<StoryDetail>(`/v1/stories/${params.storyId}`, { signal: controller.signal });
        if (cancelled) return;
        if (story.ageRating === '18') {
          if (!user || user.id === 'user-guest') {
            router.push(`/login?next=${encodeURIComponent(`/stories/${params.storyId}/chapters/${params.chapterId}`)}`);
            return;
          }
          if (!user.adultConfirmed) {
            if (!window.confirm('Este capítulo pertenece a una obra +18. Confirma que eres mayor de 18 años para continuar.')) {
              router.push(`/stories/${params.storyId}`);
              return;
            }
            await apiFetch('/v1/auth/me/adult-confirmation', {
              method: 'POST',
              body: JSON.stringify({ confirmed: true }),
            });
            await refresh();
          }
        }
        const loadedChapter = await apiFetch<ChapterDetail>(
          `/v1/stories/${params.storyId}/chapters/${params.chapterId}`,
          { signal: controller.signal },
        );
        if (cancelled) return;
        setChapter(loadedChapter);
        await loadComments(false, controller.signal);
      } catch (reason) {
        if (cancelled || controller.signal.aborted) return;
        const cached = await getOfflineItem<ChapterDetail>(chapterCacheKey);
        if (cancelled) return;
        if (cached) setChapter(cached);
        else setAccessError(reason instanceof Error ? reason.message : 'No pudimos abrir el capítulo.');
      }
    }
    void loadProtectedChapter();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [chapterCacheKey, loadComments, params.chapterId, params.storyId, refresh, router, user?.adultConfirmed, user?.id]);

  useEffect(() => {
    const saved = window.localStorage.getItem('readinn-reader-settings');
    if (!saved) return;
    try {
      const value = JSON.parse(saved) as { font?: ReaderFont; fontSize?: number; theme?: ReaderTheme };
      if (fontOptions.some((option) => option.id === value.font)) setFont(value.font!);
      if (typeof value.fontSize === 'number') setFontSize(Math.min(30, Math.max(15, value.fontSize)));
      if (value.theme && value.theme in themeOptions) setTheme(value.theme);
    } catch {}
  }, []);

  function saveSettings(next: { font?: ReaderFont; fontSize?: number; theme?: ReaderTheme }) {
    const value = { font, fontSize, theme, ...next };
    if (next.font) setFont(next.font);
    if (next.fontSize) setFontSize(next.fontSize);
    if (next.theme) setTheme(next.theme);
    window.localStorage.setItem('readinn-reader-settings', JSON.stringify(value));
  }

  const copy = useMemo(() => {
    const parsed = paragraphs(chapter?.content);
    return parsed.length ? parsed : paragraphs(chapter?.plainText);
  }, [chapter?.content, chapter?.plainText]);
  const { commentsByParagraph, generalComments, repliesByParent } = useMemo(() => {
    const paragraphMap = new Map<number, ChapterComment[]>();
    const general: ChapterComment[] = [];
    const replyMap = new Map<string, ChapterComment[]>();
    for (const comment of comments) {
      if (comment.parentCommentId) {
        const replies = replyMap.get(comment.parentCommentId) ?? [];
        replies.push(comment);
        replyMap.set(comment.parentCommentId, replies);
      } else if (comment.paragraphIndex !== undefined) {
        const paragraphComments = paragraphMap.get(comment.paragraphIndex) ?? [];
        paragraphComments.push(comment);
        paragraphMap.set(comment.paragraphIndex, paragraphComments);
      } else {
        general.push(comment);
      }
    }
    for (const replies of replyMap.values()) {
      replies.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    return { commentsByParagraph: paragraphMap, generalComments: general, repliesByParent: replyMap };
  }, [comments]);
  const colors = themeOptions[theme];

  if (accessError) return <div className="page"><div className="error-state">{accessError}</div></div>;
  const fontFamily = fontOptions.find((option) => option.id === font)?.family ?? fontOptions[0]!.family;

  function updateComments(updater: (current: ChapterComment[]) => ChapterComment[]) {
    setComments((current) => {
      const next = updater(current);
      void putOfflineItem(commentsCacheKey, next);
      return next;
    });
  }

  async function submitComment(body: string, paragraphIndex?: number, parentCommentId?: string) {
    const created = await apiFetch<ChapterComment>(`/v1/stories/${params.storyId}/chapters/${params.chapterId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, paragraphIndex, parentCommentId }),
    });
    updateComments((current) => [created, ...current]);
  }

  async function voteComment(comment: ChapterComment, value: -1 | 1) {
    const nextValue = comment.currentVote === value ? 0 : value;
    const result = await apiFetch<Pick<ChapterComment, 'upvotes' | 'downvotes' | 'score' | 'currentVote' | 'isHidden'>>(`/v1/stories/${params.storyId}/chapters/${params.chapterId}/comments/${comment.id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ value: nextValue }),
    });
    updateComments((current) => current.map((item) => (
      item.id === comment.id ? { ...item, ...result, likes: result.upvotes } : item
    )));
  }

  async function revealHiddenComments() {
    if (!user?.isAdmin) return;
    setShowHiddenComments(true);
    await loadComments(true);
  }

  async function saveForOffline() {
    if (!chapter) return;
    await Promise.all([
      putOfflineItem(chapterCacheKey, chapter),
      putOfflineItem(commentsCacheKey, comments),
    ]);
    setOfflineSaved(true);
  }

  if (!chapter) return <div className="reader-page">Cargando capitulo...</div>;

  return (
    <div className="public-reader" style={{ backgroundColor: colors.background, color: colors.text }}>
      <article className="reader-page">
        <div className="reader-command-bar">
          <Link className="reader-back" href={`/stories/${params.storyId}`}>
            <ArrowLeft size={17} />{chapter.storyTitle}
          </Link>
          <div>
            <details className="reader-download-menu">
              <summary className="reader-icon-button" title="Descargar o guardar"><Download size={19} /><span className="sr-only">Descargar o guardar</span></summary>
              <div>
                <a href={apiUrl(`/v1/stories/${params.storyId}/download?format=epub`)}>Descargar EPUB</a>
                <a href={apiUrl(`/v1/stories/${params.storyId}/download?format=pdf`)}>Descargar PDF</a>
                <button onClick={() => void saveForOffline()}><BookDown size={16} />{offlineSaved ? 'Guardado sin conexion' : 'Guardar sin conexion'}</button>
              </div>
            </details>
            <button className="reader-icon-button" title="Ajustes de lectura" onClick={() => setShowSettings((value) => !value)}>
              <Settings2 size={19} /><span className="sr-only">Ajustes de lectura</span>
            </button>
          </div>
        </div>

        {showSettings && (
          <section className="reader-settings" aria-label="Ajustes de lectura">
            <div className="reader-settings-head"><strong>Ajustes de lectura</strong><button title="Cerrar" onClick={() => setShowSettings(false)}><X size={18} /></button></div>
            <label>Tipografia</label>
            <div className="font-options">
              {fontOptions.map((option) => (
                <button
                  key={option.id}
                  className={font === option.id ? 'active' : ''}
                  style={{ fontFamily: option.family }}
                  onClick={() => saveSettings({ font: option.id })}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label htmlFor="reader-font-size">Tamano</label>
            <div className="reader-size-control">
              <button title="Reducir texto" onClick={() => saveSettings({ fontSize: Math.max(15, fontSize - 1) })}>A-</button>
              <input id="reader-font-size" type="range" min="15" max="30" value={fontSize} onChange={(event) => saveSettings({ fontSize: Number(event.target.value) })} />
              <button title="Aumentar texto" onClick={() => saveSettings({ fontSize: Math.min(30, fontSize + 1) })}>A+</button>
            </div>
            <label>Tema</label>
            <div className="reader-theme-options">
              {(Object.keys(themeOptions) as ReaderTheme[]).map((option) => (
                <button
                  key={option}
                  className={theme === option ? 'active' : ''}
                  title={option === 'light' ? 'Claro' : option === 'sepia' ? 'Sepia' : 'Oscuro'}
                  style={{ backgroundColor: themeOptions[option].background }}
                  onClick={() => saveSettings({ theme: option })}
                ><span className="sr-only">{option}</span></button>
              ))}
            </div>
          </section>
        )}

        <span className="eyebrow">Capitulo {chapter.position}</span>
        <h1 style={{ fontFamily }}>{chapter.title}</h1>
        <div className="reader-copy" style={{ fontFamily, fontSize, color: colors.text }}>
          {copy.map((paragraph, index) => {
            const inlineComments = commentsByParagraph.get(index) ?? [];
            return (
              <section className="reader-paragraph" key={index}>
                <p>{paragraph}</p>
                <button
                  className="inline-comment-command"
                  style={{ color: colors.muted }}
                  title="Comentar parrafo"
                  onClick={() => setActiveParagraph(activeParagraph === index ? null : index)}
                >
                  <MessageCircle size={16} />{inlineComments.length || <span className="sr-only">Sin comentarios</span>}
                </button>
                {activeParagraph === index && (
                  <div className="inline-thread">
                    {inlineComments.map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        repliesByParent={repliesByParent}
                        muted={colors.muted}
                        canVote={Boolean(user)}
                        canReply={Boolean(user)}
                        canReveal={Boolean(user?.isAdmin)}
                        revealed={showHiddenComments}
                        onReply={(body, parentId) => submitComment(body, index, parentId)}
                        onVote={voteComment}
                        onReveal={revealHiddenComments}
                      />
                    ))}
                    {user && <CommentComposer placeholder="Comentar este parrafo" onSubmit={(body) => submitComment(body, index)} />}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <section className="chapter-comments">
          <h2>Comentarios</h2>
          {user && <CommentComposer placeholder="Comentar el capitulo" onSubmit={submitComment} />}
          <div className="comment-list">
            {generalComments.length
              ? generalComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  repliesByParent={repliesByParent}
                  muted={colors.muted}
                  canVote={Boolean(user)}
                  canReply={Boolean(user)}
                  canReveal={Boolean(user?.isAdmin)}
                  revealed={showHiddenComments}
                  onReply={(body, parentId) => submitComment(body, undefined, parentId)}
                  onVote={voteComment}
                  onReveal={revealHiddenComments}
                />
              ))
              : <p style={{ color: colors.muted }}>Todavia no hay comentarios.</p>}
          </div>
        </section>
      </article>
    </div>
  );
}

function CommentComposer({ placeholder, onSubmit }: { placeholder: string; onSubmit: (body: string) => Promise<void> }) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = body.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await onSubmit(value);
      setBody('');
    } finally {
      setSending(false);
    }
  }
  return (
    <form className="comment-composer" onSubmit={submit}>
      <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={placeholder} maxLength={1000} />
      <button title="Publicar comentario" disabled={sending || !body.trim()}><Send size={18} /><span className="sr-only">Publicar comentario</span></button>
    </form>
  );
}

function CommentItem({
  comment,
  repliesByParent,
  muted,
  canVote,
  canReply,
  canReveal,
  revealed,
  onReply,
  onVote,
  onReveal,
  depth = 0,
}: {
  comment: ChapterComment;
  repliesByParent: Map<string, ChapterComment[]>;
  muted: string;
  canVote: boolean;
  canReply: boolean;
  canReveal: boolean;
  revealed: boolean;
  onReply: (body: string, parentId: string) => Promise<void>;
  onVote: (comment: ChapterComment, value: -1 | 1) => Promise<void>;
  onReveal: () => Promise<void>;
  depth?: number;
}) {
  const [replying, setReplying] = useState(false);
  const name = comment.authorUsername
    ? <Link href={`/users/${comment.authorUsername}`}>{comment.authorName}</Link>
    : comment.authorName;
  const replies = repliesByParent.get(comment.id) ?? [];
  const hiddenBody = comment.isHidden && !revealed;
  return (
    <div className="comment-thread" style={{ marginLeft: depth ? Math.min(depth, 3) * 18 : 0 }}>
      <article className={`comment-item${hiddenBody ? ' hidden-comment' : ''}`}>
        <div className="comment-avatar">
          {comment.authorAvatarUrl
            ? <img src={comment.authorAvatarUrl} alt="" />
            : comment.authorName.slice(0, 1).toUpperCase()}
        </div>
        <div className="comment-content">
          <strong>{name}</strong>
          <p>{comment.body}</p>
          {hiddenBody && canReveal && <button className="comment-reveal" onClick={() => void onReveal()}><Eye size={15} />Mostrar de todas maneras</button>}
          <div className="comment-actions" style={{ color: muted }}>
            <button disabled={!canVote} className={comment.currentVote === 1 ? 'active' : ''} title={canVote ? 'Upvote' : 'Inicia sesion para votar'} onClick={() => void onVote(comment, 1)}><ChevronUp size={17} /></button>
            <span>{comment.score}</span>
            <button disabled={!canVote} className={comment.currentVote === -1 ? 'active negative' : ''} title={canVote ? 'Downvote' : 'Inicia sesion para votar'} onClick={() => void onVote(comment, -1)}><ChevronDown size={17} /></button>
            <button disabled={!canReply} title={canReply ? 'Responder' : 'Inicia sesion para responder'} onClick={() => setReplying((value) => !value)}><Reply size={15} />Responder</button>
            <time>{new Date(comment.createdAt).toLocaleString('es-CL')}</time>
          </div>
          {replying && <CommentComposer placeholder={`Responder a ${comment.authorName}`} onSubmit={async (body) => { await onReply(body, comment.id); setReplying(false); }} />}
        </div>
      </article>
      {replies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          repliesByParent={repliesByParent}
          muted={muted}
          canVote={canVote}
          canReply={canReply}
          canReveal={canReveal}
          revealed={revealed}
          onReply={onReply}
          onVote={onVote}
          onReveal={onReveal}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}
