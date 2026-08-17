CREATE TYPE "StoryTagKind" AS ENUM ('type', 'setting', 'tone', 'content', 'theme');

CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(110) NOT NULL,
    "kind" "StoryTagKind" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "story_tags" (
    "story_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    CONSTRAINT "story_tags_pkey" PRIMARY KEY ("story_id", "tag_id")
);

CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");
CREATE INDEX "tags_kind_sort_order_idx" ON "tags"("kind", "sort_order");
CREATE INDEX "story_tags_tag_id_story_id_idx" ON "story_tags"("tag_id", "story_id");

ALTER TABLE "story_tags" ADD CONSTRAINT "story_tags_story_id_fkey"
  FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_tags" ADD CONSTRAINT "story_tags_tag_id_fkey"
  FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
