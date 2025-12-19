-- CreateEnum
CREATE TYPE "ResignationType" AS ENUM ('SINGLE', 'GAMMON', 'BACKGAMMON');

-- CreateEnum
CREATE TYPE "MatchState" AS ENUM ('IN_PROGRESS', 'FINISHED');

-- AlterTable
ALTER TABLE "games" ADD COLUMN     "cube_level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "cube_owner" "Player",
ADD COLUMN     "match_length" INTEGER,
ADD COLUMN     "resignation_type" "ResignationType";

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "length" INTEGER NOT NULL,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "state" "MatchState" NOT NULL DEFAULT 'IN_PROGRESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "matches_game_id_key" ON "matches"("game_id");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
