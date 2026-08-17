export type StoryStatus = 'draft' | 'published' | 'completed' | 'archived' | 'suspended';
export type ChapterStatus = 'draft' | 'scheduled' | 'published' | 'unpublished' | 'archived';

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  adultConfirmed?: boolean;
}

export interface ChapterSummary {
  id: string;
  storyId: string;
  position: number;
  title: string;
  status?: ChapterStatus;
  wordCount?: number;
  updatedAt?: string;
  sourceUrl?: string;
  sourceLicense?: string;
}

export interface StorySummary {
  id: string;
  title: string;
  author: string;
  authorUsername: string;
  synopsis: string;
  genre: string;
  genres?: string[];
  tags?: StoryTag[];
  languageCode?: string;
  status: StoryStatus;
  chapterCount: number;
  isMature: boolean;
  ageRating?: 'all' | '11' | '13' | '16' | '18';
  coverColor: string;
  updatedAt?: string;
  averageRating?: number;
  ratingCount?: number;
}

export interface StoryTag {
  name: string;
  kind: 'type' | 'setting' | 'tone' | 'content' | 'theme';
}

export interface StoryTaxonomy {
  genres: string[];
  tagGroups: Array<{ kind: StoryTag['kind']; label: string; tags: string[] }>;
  sortOptions: Array<{ value: 'recent' | 'popular' | 'rating' | 'chapters' | 'title'; label: string }>;
  ageRatings: Array<{ value: 'all' | '11' | '13' | '16' | '18'; label: string }>;
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

export interface ChapterComment {
  id: string;
  storyId: string;
  chapterId: string;
  authorName: string;
  authorUsername?: string;
  authorAvatarUrl?: string | null;
  body: string;
  createdAt: string;
  likes: number;
  upvotes: number;
  downvotes: number;
  score: number;
  currentVote: -1 | 0 | 1;
  isHidden: boolean;
  paragraphIndex?: number;
  parentCommentId?: string;
}

export interface WallPost {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  body: string;
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl?: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  stories: StorySummary[];
}
