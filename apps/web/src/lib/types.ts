export type StoryStatus = 'draft' | 'published' | 'completed' | 'archived' | 'suspended';
export type ChapterStatus = 'draft' | 'scheduled' | 'published' | 'unpublished' | 'archived';

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
}

export interface ChapterSummary {
  id: string;
  storyId: string;
  position: number;
  title: string;
  status?: ChapterStatus;
  wordCount?: number;
  updatedAt?: string;
}

export interface StorySummary {
  id: string;
  title: string;
  author: string;
  authorUsername: string;
  synopsis: string;
  genre: string;
  status: StoryStatus;
  chapterCount: number;
  isMature: boolean;
  coverColor: string;
  updatedAt?: string;
}

export interface StoryDetail extends StorySummary {
  chapters: ChapterSummary[];
}

export interface ChapterDetail extends ChapterSummary {
  storyTitle: string;
  content: unknown;
  contentVersion?: number;
  plainText?: string;
}

export interface ChapterRevision {
  id: string;
  version: number;
  title: string;
  createdAt: string;
  reason: string;
}
