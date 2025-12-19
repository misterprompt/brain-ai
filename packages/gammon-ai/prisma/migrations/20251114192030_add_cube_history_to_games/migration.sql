ALTER TABLE "games"
  ADD COLUMN "cube_history" JSONB NOT NULL DEFAULT '[]';
