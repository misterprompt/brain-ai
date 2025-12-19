-- CreateEnum
CREATE TYPE "TimeControlPreset" AS ENUM ('BLITZ', 'NORMAL', 'LONG', 'CUSTOM');

-- AlterTable
ALTER TABLE "games"
  ADD COLUMN "time_control_preset" "TimeControlPreset",
  ADD COLUMN "time_control_total_ms" INTEGER,
  ADD COLUMN "time_control_increment_ms" INTEGER,
  ADD COLUMN "time_control_delay_ms" INTEGER,
  ADD COLUMN "white_time_remaining_ms" INTEGER,
  ADD COLUMN "black_time_remaining_ms" INTEGER;
