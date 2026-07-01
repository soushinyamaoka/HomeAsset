-- CreateTable
CREATE TABLE "households" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_members" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_type" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "memo" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_assets" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL DEFAULT 'device',
    "name" TEXT NOT NULL,
    "category_id" TEXT,
    "manufacturer" TEXT,
    "model_number" TEXT,
    "serial_number" TEXT,
    "location_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "purchase_date" DATE,
    "installed_date" DATE,
    "construction_date" DATE,
    "purchase_store" TEXT,
    "contractor_name" TEXT,
    "contractor_contact" TEXT,
    "contact_person" TEXT,
    "purchase_price" DECIMAL(12,2),
    "construction_cost" DECIMAL(12,2),
    "purchase_url" TEXT,
    "order_number" TEXT,
    "contract_number" TEXT,
    "receipt_url" TEXT,
    "construction_document_url" TEXT,
    "warranty_start_date" DATE,
    "warranty_end_date" DATE,
    "has_extended_warranty" BOOLEAN NOT NULL DEFAULT false,
    "warranty_memo" TEXT,
    "manual_url" TEXT,
    "official_url" TEXT,
    "support_url" TEXT,
    "photo_url" TEXT,
    "label_photo_url" TEXT,
    "before_photo_url" TEXT,
    "after_photo_url" TEXT,
    "expected_lifespan_years" INTEGER,
    "replacement_due_date" DATE,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "home_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_specs" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "spec_name" TEXT NOT NULL,
    "spec_value" TEXT,
    "unit" TEXT,
    "memo" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_links" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "link_type" TEXT NOT NULL,
    "title" TEXT,
    "url" TEXT NOT NULL,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "maintenance_date" DATE NOT NULL,
    "maintenance_type" TEXT NOT NULL,
    "description" TEXT,
    "cost" DECIMAL(12,2),
    "performed_by" TEXT,
    "vendor_name" TEXT,
    "next_due_date" DATE,
    "photo_url" TEXT,
    "document_url" TEXT,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_records" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "occurred_date" DATE NOT NULL,
    "symptom" TEXT,
    "cause" TEXT,
    "action_taken" TEXT,
    "vendor_name" TEXT,
    "ticket_number" TEXT,
    "estimated_cost" DECIMAL(12,2),
    "cost" DECIMAL(12,2),
    "used_warranty" BOOLEAN NOT NULL DEFAULT false,
    "completed_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "photo_url" TEXT,
    "estimate_url" TEXT,
    "invoice_url" TEXT,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumables" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model_number" TEXT,
    "replacement_interval_text" TEXT,
    "last_replaced_date" DATE,
    "next_replacement_date" DATE,
    "purchase_url" TEXT,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_infos" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "host_name" TEXT,
    "mac_address" TEXT,
    "admin_url" TEXT,
    "port" INTEGER,
    "connection_type" TEXT,
    "credential_storage_memo" TEXT,
    "settings_memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "network_infos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accessories" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER,
    "storage_location" TEXT,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accessories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_import_logs" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "source_ai_name" TEXT,
    "input_prompt" TEXT,
    "raw_response" TEXT,
    "parsed_json" JSONB,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memo" TEXT,

    CONSTRAINT "ai_import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "household_members_user_id_idx" ON "household_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "household_members_household_id_user_id_key" ON "household_members"("household_id", "user_id");

-- CreateIndex
CREATE INDEX "categories_household_id_idx" ON "categories"("household_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_household_id_name_key" ON "categories"("household_id", "name");

-- CreateIndex
CREATE INDEX "locations_household_id_idx" ON "locations"("household_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_household_id_name_key" ON "locations"("household_id", "name");

-- CreateIndex
CREATE INDEX "home_assets_household_id_idx" ON "home_assets"("household_id");

-- CreateIndex
CREATE INDEX "home_assets_household_id_status_idx" ON "home_assets"("household_id", "status");

-- CreateIndex
CREATE INDEX "home_assets_household_id_asset_type_idx" ON "home_assets"("household_id", "asset_type");

-- CreateIndex
CREATE INDEX "home_assets_household_id_deleted_at_idx" ON "home_assets"("household_id", "deleted_at");

-- CreateIndex
CREATE INDEX "asset_specs_asset_id_idx" ON "asset_specs"("asset_id");

-- CreateIndex
CREATE INDEX "asset_links_asset_id_idx" ON "asset_links"("asset_id");

-- CreateIndex
CREATE INDEX "maintenance_records_asset_id_idx" ON "maintenance_records"("asset_id");

-- CreateIndex
CREATE INDEX "maintenance_records_household_id_next_due_date_idx" ON "maintenance_records"("household_id", "next_due_date");

-- CreateIndex
CREATE INDEX "repair_records_asset_id_idx" ON "repair_records"("asset_id");

-- CreateIndex
CREATE INDEX "consumables_asset_id_idx" ON "consumables"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "network_infos_asset_id_key" ON "network_infos"("asset_id");

-- CreateIndex
CREATE INDEX "accessories_asset_id_idx" ON "accessories"("asset_id");

-- CreateIndex
CREATE INDEX "ai_import_logs_household_id_idx" ON "ai_import_logs"("household_id");

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_assets" ADD CONSTRAINT "home_assets_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_assets" ADD CONSTRAINT "home_assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_assets" ADD CONSTRAINT "home_assets_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_specs" ADD CONSTRAINT "asset_specs_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_specs" ADD CONSTRAINT "asset_specs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "home_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_links" ADD CONSTRAINT "asset_links_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_links" ADD CONSTRAINT "asset_links_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "home_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "home_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_records" ADD CONSTRAINT "repair_records_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_records" ADD CONSTRAINT "repair_records_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "home_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumables" ADD CONSTRAINT "consumables_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumables" ADD CONSTRAINT "consumables_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "home_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_infos" ADD CONSTRAINT "network_infos_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_infos" ADD CONSTRAINT "network_infos_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "home_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessories" ADD CONSTRAINT "accessories_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessories" ADD CONSTRAINT "accessories_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "home_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_import_logs" ADD CONSTRAINT "ai_import_logs_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_import_logs" ADD CONSTRAINT "ai_import_logs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "home_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
