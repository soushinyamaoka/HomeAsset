-- CreateTable
CREATE TABLE "migration_mappings" (
    "id" TEXT NOT NULL,
    "migration_name" TEXT NOT NULL,
    "source_table" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "target_table" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migration_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_logs" (
    "id" TEXT NOT NULL,
    "migration_name" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "summary_json" JSONB,
    "error_message" TEXT,

    CONSTRAINT "migration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "migration_mappings_migration_name_source_table_idx" ON "migration_mappings"("migration_name", "source_table");

-- CreateIndex
CREATE UNIQUE INDEX "migration_mappings_migration_name_source_table_source_id_ta_key" ON "migration_mappings"("migration_name", "source_table", "source_id", "target_table");

-- CreateIndex
CREATE INDEX "migration_logs_migration_name_idx" ON "migration_logs"("migration_name");
