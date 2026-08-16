-- Add threaded comments and one vote per user/comment.
ALTER TABLE "chapter_comments"
  ADD COLUMN "parent_id" UUID,
  ADD COLUMN "downvotes" INTEGER NOT NULL DEFAULT 0;

UPDATE "chapter_comments"
SET "downvotes" = 0
WHERE "downvotes" IS NULL;

CREATE INDEX "chapter_comments_parent_id_idx" ON "chapter_comments"("parent_id");

ALTER TABLE "chapter_comments"
  ADD CONSTRAINT "chapter_comments_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "chapter_comments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "comment_votes" (
  "comment_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "value" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "comment_votes_pkey" PRIMARY KEY ("comment_id", "user_id"),
  CONSTRAINT "comment_votes_value_check" CHECK ("value" IN (-1, 1))
);

CREATE INDEX "comment_votes_comment_id_value_idx" ON "comment_votes"("comment_id", "value");

ALTER TABLE "comment_votes"
  ADD CONSTRAINT "comment_votes_comment_id_fkey"
  FOREIGN KEY ("comment_id") REFERENCES "chapter_comments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comment_votes"
  ADD CONSTRAINT "comment_votes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
