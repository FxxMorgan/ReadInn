'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { BookCard } from './book-card';
import type { StorySummary } from '@/lib/types';

export function StoryShelf({
  title,
  description,
  stories,
  onMore,
}: {
  title: string;
  description: string;
  stories: StorySummary[];
  onMore: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const move = (direction: number) => {
    track.current?.scrollBy({ left: direction * track.current.clientWidth * 0.82, behavior: 'smooth' });
  };

  return (
    <section className="story-shelf">
      <div className="shelf-heading">
        <div><h2>{title}</h2><p>{description}</p></div>
        <div className="shelf-actions">
          <button className="shelf-arrow" type="button" title={`Anterior: ${title}`} onClick={() => move(-1)}><ChevronLeft size={17} /></button>
          <button className="shelf-arrow" type="button" title={`Siguiente: ${title}`} onClick={() => move(1)}><ChevronRight size={17} /></button>
          <button className="shelf-more" type="button" onClick={onMore}>Ver más<ChevronRight size={17} /></button>
        </div>
      </div>
      <div className="shelf-carousel" ref={track}>
        {stories.map((story) => <BookCard key={story.id} story={story} />)}
      </div>
    </section>
  );
}
