-- AlterTable
ALTER TABLE "games" ADD COLUMN     "double_offered_by" TEXT,
ADD COLUMN     "double_pending" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "crawford_used" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cube_history" JSONB NOT NULL DEFAULT '[]';
