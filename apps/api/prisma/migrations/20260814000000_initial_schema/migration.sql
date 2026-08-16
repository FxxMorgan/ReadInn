CREATE TYPE "AccountStatus" AS ENUM ('pending_verification', 'active', 'suspended', 'deleted');
CREATE TYPE "StoryStatus" AS ENUM ('draft', 'published', 'completed', 'archived', 'suspended');
CREATE TYPE "ChapterStatus" AS ENUM ('draft', 'scheduled', 'published', 'unpublished', 'archived');

CREATE TABLE "users" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "account_status" "AccountStatus" NOT NULL DEFAULT 'pending_verification',
  "is_admin" BOOLEAN NOT NULL DEFAULT false,
  "email_verified_at" TIMESTAMP(3),
  "writer_onboarded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_profiles" (
  "user_id" UUID NOT NULL,
  "display_name" TEXT NOT NULL,
  "bio" VARCHAR(500),
  "avatar_url" TEXT,
  "donation_url" TEXT,
  "locale" TEXT NOT NULL DEFAULT 'es',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE "stories" (
  "id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "synopsis" VARCHAR(3000) NOT NULL,
  "status" "StoryStatus" NOT NULL DEFAULT 'draft',
  "is_mature" BOOLEAN NOT NULL DEFAULT false,
  "cover_url" TEXT,
  "language_code" TEXT NOT NULL DEFAULT 'es',
  "word_count" INTEGER NOT NULL DEFAULT 0,
  "published_chapter_count" INTEGER NOT NULL DEFAULT 0,
  "published_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "archived_at" TIMESTAMP(3),
  CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "genres" (
  "id" UUID NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "slug" VARCHAR(80) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "story_genres" (
  "story_id" UUID NOT NULL,
  "genre_id" UUID NOT NULL,
  CONSTRAINT "story_genres_pkey" PRIMARY KEY ("story_id", "genre_id")
);

CREATE TABLE "chapters" (
  "id" UUID NOT NULL,
  "story_id" UUID NOT NULL,
  "slug" VARCHAR(150) NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "status" "ChapterStatus" NOT NULL DEFAULT 'draft',
  "position" INTEGER NOT NULL,
  "content_json" JSONB NOT NULL,
  "plain_text" TEXT NOT NULL,
  "content_version" INTEGER NOT NULL DEFAULT 1,
  "word_count" INTEGER NOT NULL DEFAULT 0,
  "estimated_read_minutes" INTEGER NOT NULL DEFAULT 0,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "archived_at" TIMESTAMP(3),
  CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "stories_slug_key" ON "stories"("slug");
CREATE INDEX "stories_author_id_updated_at_idx" ON "stories"("author_id", "updated_at" DESC);
CREATE INDEX "stories_status_published_at_idx" ON "stories"("status", "published_at" DESC);
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");
CREATE UNIQUE INDEX "chapters_story_id_slug_key" ON "chapters"("story_id", "slug");
CREATE UNIQUE INDEX "chapters_story_id_position_key" ON "chapters"("story_id", "position");
CREATE INDEX "chapters_story_id_status_position_idx" ON "chapters"("story_id", "status", "position");

ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stories" ADD CONSTRAINT "stories_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "story_genres" ADD CONSTRAINT "story_genres_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_genres" ADD CONSTRAINT "story_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
