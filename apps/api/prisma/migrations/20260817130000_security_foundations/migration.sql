CREATE TYPE "StoryCreationMethod" AS ENUM ('human', 'ai_assisted', 'ai_generated');

ALTER TABLE "stories"
  ADD COLUMN "creation_method" "StoryCreationMethod" NOT NULL DEFAULT 'human',
  ADD COLUMN "average_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "rating_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "read_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "chapter_comments"
  ADD COLUMN "depth" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "users"
  ADD COLUMN "is_placeholder" BOOLEAN NOT NULL DEFAULT false;

UPDATE "stories" AS story
SET "average_rating" = ratings.average_rating,
    "rating_count" = ratings.rating_count
FROM (
  SELECT "story_id", AVG("rating")::DOUBLE PRECISION AS average_rating, COUNT(*)::INTEGER AS rating_count
  FROM "story_ratings"
  GROUP BY "story_id"
) AS ratings
WHERE story."id" = ratings."story_id";

UPDATE "stories" AS story
SET "read_count" = reads.read_count
FROM (
  SELECT "story_id", COUNT(*)::INTEGER AS read_count
  FROM "reading_events"
  WHERE "event_type" = 'chapter_opened'
  GROUP BY "story_id"
) AS reads
WHERE story."id" = reads."story_id";

CREATE TABLE "bookmarks" (
  "user_id" UUID NOT NULL,
  "story_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("user_id", "story_id")
);

CREATE TABLE "story_likes" (
  "user_id" UUID NOT NULL,
  "story_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "story_likes_pkey" PRIMARY KEY ("user_id", "story_id")
);

CREATE TABLE "reading_progress" (
  "user_id" UUID NOT NULL,
  "story_id" UUID NOT NULL,
  "chapter_id" UUID NOT NULL,
  "progress_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "last_position" DOUBLE PRECISION,
  "is_completed" BOOLEAN NOT NULL DEFAULT false,
  "seen_chapter_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("user_id", "story_id")
);

CREATE TABLE "refresh_sessions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_assets" (
  "id" VARCHAR(80) NOT NULL,
  "owner_id" UUID NOT NULL,
  "filename" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(80) NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "purpose" VARCHAR(30) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "object_key" VARCHAR(500) NOT NULL,
  "public_url" TEXT NOT NULL,
  "uploaded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "moderation_reports" (
  "id" UUID NOT NULL,
  "reporter_id" UUID,
  "target_type" VARCHAR(30) NOT NULL,
  "target_id" VARCHAR(160) NOT NULL,
  "reason" VARCHAR(40) NOT NULL,
  "details" VARCHAR(1000),
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "moderation_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_sessions_token_hash_key" ON "refresh_sessions"("token_hash");
CREATE UNIQUE INDEX "media_assets_object_key_key" ON "media_assets"("object_key");
CREATE INDEX "stories_status_average_rating_idx" ON "stories"("status", "average_rating" DESC);
CREATE INDEX "stories_status_read_count_idx" ON "stories"("status", "read_count" DESC);
CREATE INDEX "stories_status_title_idx" ON "stories"("status", "title");
CREATE INDEX "stories_status_creation_method_published_at_idx" ON "stories"("status", "creation_method", "published_at" DESC);
CREATE INDEX "bookmarks_user_id_created_at_idx" ON "bookmarks"("user_id", "created_at" DESC);
CREATE INDEX "story_likes_story_id_created_at_idx" ON "story_likes"("story_id", "created_at" DESC);
CREATE INDEX "reading_progress_user_id_updated_at_idx" ON "reading_progress"("user_id", "updated_at" DESC);
CREATE INDEX "reading_progress_chapter_id_idx" ON "reading_progress"("chapter_id");
CREATE INDEX "refresh_sessions_user_id_revoked_at_idx" ON "refresh_sessions"("user_id", "revoked_at");
CREATE INDEX "media_assets_owner_id_created_at_idx" ON "media_assets"("owner_id", "created_at" DESC);
CREATE INDEX "moderation_reports_status_created_at_idx" ON "moderation_reports"("status", "created_at" DESC);
CREATE INDEX "moderation_reports_target_type_target_id_idx" ON "moderation_reports"("target_type", "target_id");

ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
