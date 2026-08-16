-- Persist chapter discussions and public profile interactions.
CREATE TABLE "chapter_comments" (
  "id" UUID NOT NULL,
  "story_id" UUID NOT NULL,
  "chapter_id" UUID NOT NULL,
  "author_id" UUID,
  "author_name" VARCHAR(80) NOT NULL,
  "body" VARCHAR(1000) NOT NULL,
  "paragraph_index" INTEGER,
  "likes" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "chapter_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_follows" (
  "follower_id" UUID NOT NULL,
  "following_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_follows_pkey" PRIMARY KEY ("follower_id", "following_id"),
  CONSTRAINT "user_follows_not_self" CHECK ("follower_id" <> "following_id")
);

CREATE TABLE "wall_posts" (
  "id" UUID NOT NULL,
  "profile_user_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "body" VARCHAR(1000) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wall_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chapter_comments_chapter_id_created_at_idx" ON "chapter_comments"("chapter_id", "created_at" DESC);
CREATE INDEX "chapter_comments_story_id_idx" ON "chapter_comments"("story_id");
CREATE INDEX "user_follows_following_id_created_at_idx" ON "user_follows"("following_id", "created_at" DESC);
CREATE INDEX "wall_posts_profile_user_id_created_at_idx" ON "wall_posts"("profile_user_id", "created_at" DESC);

ALTER TABLE "chapter_comments" ADD CONSTRAINT "chapter_comments_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chapter_comments" ADD CONSTRAINT "chapter_comments_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chapter_comments" ADD CONSTRAINT "chapter_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wall_posts" ADD CONSTRAINT "wall_posts_profile_user_id_fkey" FOREIGN KEY ("profile_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wall_posts" ADD CONSTRAINT "wall_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
