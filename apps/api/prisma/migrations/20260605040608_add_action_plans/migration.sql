-- CreateTable
CREATE TABLE "action_plans" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "management_policy" TEXT,
    "action_phase" TEXT,
    "next_action" TEXT,
    "professional_trigger" TEXT,
    "estimate_timing" TEXT,
    "replacement_decision_timing" TEXT,
    "replacement_year_from" INTEGER,
    "replacement_year_to" INTEGER,
    "replacement_status" TEXT,
    "replacement_cost_min" INTEGER,
    "replacement_cost_max" INTEGER,
    "routine_cost_min" INTEGER,
    "routine_cost_max" INTEGER,
    "professional_cost_min" INTEGER,
    "professional_cost_max" INTEGER,
    "baseline_year" INTEGER,
    "priority" TEXT,
    "notes" TEXT[],
    "source" TEXT DEFAULT 'ai_action_plan',
    "schema_version" TEXT,
    "generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "action_plans_asset_id_key" ON "action_plans"("asset_id");

-- CreateIndex
CREATE INDEX "action_plans_household_id_idx" ON "action_plans"("household_id");

-- CreateIndex
CREATE INDEX "action_plans_household_id_replacement_year_from_idx" ON "action_plans"("household_id", "replacement_year_from");

-- AddForeignKey
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "home_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
