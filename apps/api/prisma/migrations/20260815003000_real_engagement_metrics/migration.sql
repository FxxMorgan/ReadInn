CREATE TABLE "story_ratings" (
    "story_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_ratings_pkey" PRIMARY KEY ("story_id", "user_id"),
    CONSTRAINT "story_ratings_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

CREATE TABLE "reading_events" (
    "id" UUID NOT NULL,
    "event_id" VARCHAR(120) NOT NULL,
    "story_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "reader_key" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(40) NOT NULL,
    "active_seconds" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reading_events_event_id_key" ON "reading_events"("event_id");
CREATE INDEX "story_ratings_story_id_idx" ON "story_ratings"("story_id");
CREATE INDEX "reading_events_story_id_created_at_idx" ON "reading_events"("story_id", "created_at" DESC);
CREATE INDEX "reading_events_story_id_reader_key_idx" ON "reading_events"("story_id", "reader_key");

ALTER TABLE "story_ratings"
    ADD CONSTRAINT "story_ratings_story_id_fkey"
    FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "story_ratings"
    ADD CONSTRAINT "story_ratings_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reading_events"
    ADD CONSTRAINT "reading_events_story_id_fkey"
    FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reading_events"
    ADD CONSTRAINT "reading_events_chapter_id_fkey"
    FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
