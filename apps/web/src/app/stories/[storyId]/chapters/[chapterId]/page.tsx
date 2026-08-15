'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { ChapterDetail } from '@/lib/types';

function paragraphs(content: unknown): string[] {
  if (Array.isArray(content)) return content.map(String);
  if (content && typeof content === 'object' && 'content' in content) {
    const nodes = (content as { content?: Array<{ content?: Array<{ text?: string }> }> }).content ?? [];
    return nodes.map((node) => node.content?.map((part) => part.text ?? '').join('') ?? '').filter(Boolean);
  }
  return [String(content ?? '')].filter(Boolean);
}

export default function ReaderPage({ params }: { params: { storyId: string; chapterId: string } }) {
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  useEffect(() => { void apiFetch<ChapterDetail>(`/v1/stories/${params.storyId}/chapters/${params.chapterId}`).then(setChapter); }, [params.chapterId, params.storyId]);
  if (!chapter) return <div className="reader-page">Cargando capitulo...</div>;
  return <article className="reader-page"><Link className="reader-back" href={`/stories/${params.storyId}`}><ArrowLeft size={17} />{chapter.storyTitle}</Link><span className="eyebrow">Capitulo {chapter.position}</span><h1>{chapter.title}</h1><div className="reader-copy">{paragraphs(chapter.content).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></article>;
}
