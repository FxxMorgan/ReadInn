ALTER TABLE "stories"
  ADD COLUMN "attribution_name" VARCHAR(150),
  ADD COLUMN "source_url" TEXT,
  ADD COLUMN "source_license" VARCHAR(120),
  ADD COLUMN "import_key" VARCHAR(200);

CREATE UNIQUE INDEX "stories_import_key_key" ON "stories"("import_key");
