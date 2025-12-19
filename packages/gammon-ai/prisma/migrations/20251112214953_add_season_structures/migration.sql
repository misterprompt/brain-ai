-- AlterTable
ALTER TABLE "users" ADD COLUMN     "country" TEXT;

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_season_stats" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "elo" INTEGER NOT NULL,
    "winrate" DOUBLE PRECISION NOT NULL,
    "games_played" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_season_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_leaderboard" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rank_global" INTEGER NOT NULL,
    "rank_country" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "season_leaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_quota_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "quota_used" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_quota_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_season_stats_user_id_season_id_key" ON "user_season_stats"("user_id", "season_id");

-- CreateIndex
CREATE UNIQUE INDEX "season_leaderboard_season_id_user_id_key" ON "season_leaderboard"("season_id", "user_id");

-- AddForeignKey
ALTER TABLE "user_season_stats" ADD CONSTRAINT "user_season_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_season_stats" ADD CONSTRAINT "user_season_stats_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_leaderboard" ADD CONSTRAINT "season_leaderboard_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_leaderboard" ADD CONSTRAINT "season_leaderboard_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_quota_history" ADD CONSTRAINT "user_quota_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_quota_history" ADD CONSTRAINT "user_quota_history_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
