CREATE TABLE "chapter_revisions" (
    "id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "content_json" JSONB NOT NULL,
    "plain_text" TEXT NOT NULL,
    "reason" VARCHAR(40) NOT NULL DEFAULT 'autosave',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chapter_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chapter_revisions_chapter_id_version_key" ON "chapter_revisions"("chapter_id", "version");
CREATE INDEX "chapter_revisions_chapter_id_created_at_idx" ON "chapter_revisions"("chapter_id", "created_at" DESC);
ALTER TABLE "chapter_revisions" ADD CONSTRAINT "chapter_revisions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
