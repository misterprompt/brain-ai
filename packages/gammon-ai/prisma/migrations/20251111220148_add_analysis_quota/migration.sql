-- CreateTable
CREATE TABLE "analysis_quotas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "extra_quota" INTEGER NOT NULL DEFAULT 0,
    "initial_free" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "analysis_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analysis_quotas_user_id_date_key" ON "analysis_quotas"("user_id", "date");

-- AddForeignKey
ALTER TABLE "analysis_quotas" ADD CONSTRAINT "analysis_quotas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
