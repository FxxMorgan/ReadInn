import Link from 'next/link';
import { BookOpen, Clock3 } from 'lucide-react';
import type { StorySummary } from '@/lib/types';

export function BookCard({ story }: { story: StorySummary }) {
  const coverIsUrl = story.coverColor?.startsWith('http');
  return (
    <Link href={`/stories/${story.id}`} className="book-card">
      <div className="book-cover" style={coverIsUrl ? undefined : { backgroundColor: story.coverColor || '#d97745' }}>
        {coverIsUrl ? <img src={story.coverColor} alt={`Portada de ${story.title}`} /> : <BookOpen size={44} />}
      </div>
      <div className="book-meta">
        <span className="genre">{(story.genres?.length ? story.genres : [story.genre]).slice(0, 2).join(' / ')}</span>
        <h3>{story.title}</h3>
        <p>{story.author}</p>
        <span className="chapter-count"><Clock3 size={14} />{story.chapterCount} capitulos</span>
      </div>
    </Link>
  );
}
