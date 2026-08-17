ALTER TABLE "stories" ADD COLUMN "age_rating" VARCHAR(5) NOT NULL DEFAULT 'all';
ALTER TABLE "user_profiles" ADD COLUMN "adult_confirmed_at" TIMESTAMP(3);

UPDATE "stories"
SET "age_rating" = '18'
WHERE "is_mature" = true;

ALTER TABLE "stories" ADD CONSTRAINT "stories_age_rating_check"
  CHECK ("age_rating" IN ('all', '11', '13', '16', '18'));
