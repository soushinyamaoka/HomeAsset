/**
 * HomeGear → HomeAsset データ移行スクリプト
 *
 * 使い方:
 *   npm run migrate:homegear -- --input ./exports/homegear-migration-2026-05-27.json --dry-run
 *   npm run migrate:homegear -- --input ./exports/homegear-migration-2026-05-27.json --execute
 *   npm run migrate:homegear -- --verify --input ./exports/homegear-migration-2026-05-27.json
 *
 * - dry-run: DB に書き込まず、移行予定件数・警告のみ表示
 * - execute: 実際に移行（1トランザクションで全体実行、失敗時ロールバック）
 * - verify : 旧JSONの件数と新DBの件数を比較・参照整合性チェック
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'node:fs';
import * as path from 'node:path';

// --------------- 型定義（旧データ） ---------------

type OldHousehold = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type OldUser = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

type OldHouseholdMember = {
  id: string;
  household_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
};

type OldCategory = {
  id: string;
  household_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  asset_type?: string | null;
  created_at: string;
  updated_at: string;
};

type OldLocation = {
  id: string;
  household_id: string;
  name: string;
  parent_id: string | null;
  memo: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type OldDevice = {
  id: string;
  household_id: string;
  name: string;
  category_id: string | null;
  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;
  location_id: string | null;
  status: string;
  priority: string | null;
  purchase_date: string | null;
  purchase_store: string | null;
  purchase_price: number | null;
  purchase_url: string | null;
  order_number: string | null;
  receipt_url?: string | null;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  has_extended_warranty: boolean;
  warranty_memo: string | null;
  manual_url: string | null;
  official_url: string | null;
  support_url: string | null;
  photo_url: string | null;
  label_photo_url: string | null;
  installation_photo_url: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type OldDeviceSpec = {
  id: string;
  household_id: string;
  device_id: string;
  spec_name: string;
  spec_value: string | null;
  unit: string | null;
  memo: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type OldDeviceLink = {
  id: string;
  household_id: string;
  device_id: string;
  link_type: string;
  title: string | null;
  url: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

type OldMaintenance = {
  id: string;
  household_id: string;
  device_id: string;
  maintenance_date: string;
  maintenance_type: string;
  description: string | null;
  cost: number | null;
  performed_by: string | null;
  next_due_date: string | null;
  photo_url: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

type OldRepair = {
  id: string;
  household_id: string;
  device_id: string;
  occurred_date: string;
  symptom: string | null;
  cause: string | null;
  action_taken: string | null;
  repair_vendor: string | null;
  repair_ticket_number: string | null;
  cost: number | null;
  used_warranty: boolean;
  completed_date: string | null;
  status: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

type OldConsumable = {
  id: string;
  household_id: string;
  device_id: string;
  name: string;
  manufacturer: string | null;
  model_number: string | null;
  replacement_interval_text: string | null;
  last_replaced_date: string | null;
  next_replacement_date: string | null;
  purchase_url: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

type OldNetworkInfo = {
  id: string;
  household_id: string;
  device_id: string;
  ip_address: string | null;
  host_name: string | null;
  mac_address: string | null;
  admin_url: string | null;
  port: number | null;
  connection_type: string | null;
  credential_storage_memo: string | null;
  settings_memo: string | null;
  created_at: string;
  updated_at: string;
};

type OldAccessory = {
  id: string;
  household_id: string;
  device_id: string;
  name: string;
  quantity: number | null;
  storage_location: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

type OldAiImportLog = {
  id: string;
  household_id: string;
  device_id: string | null;
  source_ai_name: string | null;
  input_prompt: string | null;
  raw_response: string | null;
  parsed_json: unknown;
  imported_at: string;
  memo: string | null;
};

type ExportJson = {
  exported_at: string;
  source_app: string;
  schema_version: string;
  households?: OldHousehold[];
  users?: OldUser[];
  household_members?: OldHouseholdMember[];
  categories?: OldCategory[];
  locations?: OldLocation[];
  devices?: OldDevice[];
  device_specs?: OldDeviceSpec[];
  device_links?: OldDeviceLink[];
  maintenance_records?: OldMaintenance[];
  repair_records?: OldRepair[];
  consumables?: OldConsumable[];
  network_infos?: OldNetworkInfo[];
  accessories?: OldAccessory[];
  ai_import_logs?: OldAiImportLog[];
};

type MigrationConfig = {
  migrationName: string;
  categoryAssetTypeMap: Record<string, string>;
  statusMap: Record<string, string>;
  linkTypeMap: Record<string, string>;
};

// --------------- CLI 引数解析 ---------------

type Mode = 'dry-run' | 'execute' | 'verify';

type CliArgs = {
  mode: Mode;
  inputPath: string | null;
  configPath: string;
};

function parseArgs(argv: string[]): CliArgs {
  let mode: Mode | null = null;
  let inputPath: string | null = null;
  let configPath = path.resolve(__dirname, 'migration-config.json');

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') mode = 'dry-run';
    else if (a === '--execute') mode = 'execute';
    else if (a === '--verify') mode = 'verify';
    else if (a === '--input') inputPath = argv[++i];
    else if (a === '--config') configPath = argv[++i];
  }
  if (!mode) {
    throw new Error('モードを指定してください: --dry-run / --execute / --verify');
  }
  return { mode, inputPath, configPath };
}

// --------------- ロガー ---------------

const log = {
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
  section: (title: string) => console.log(`\n=== ${title} ===`),
};

// --------------- 検証関数 ---------------

function validateExportJson(data: unknown): asserts data is ExportJson {
  if (!data || typeof data !== 'object') {
    throw new Error('入力JSONがオブジェクトではありません');
  }
  const d = data as ExportJson;
  if (d.source_app !== 'HomeGear') {
    log.warn(`source_app が想定外です: ${d.source_app}（処理は続行）`);
  }
  if (d.schema_version !== 'device-v1') {
    log.warn(`schema_version が想定外です: ${d.schema_version}（処理は続行）`);
  }
}

// --------------- ヘルパー ---------------

function parseDateOrNull(s: string | null | undefined): Date | null {
  if (!s) return null;
  // 'YYYY-MM-DD' or ISO のいずれも new Date で受け入れ可能
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseDecimalOrNull(n: number | null | undefined): Prisma.Decimal | null {
  if (n === null || n === undefined) return null;
  return new Prisma.Decimal(n);
}

function inferAssetTypeFromCategory(
  categoryName: string | null | undefined,
  config: MigrationConfig,
): string {
  if (!categoryName) return 'device';
  const explicit = config.categoryAssetTypeMap[categoryName];
  if (explicit) return explicit;
  return 'device';
}

function mapStatus(oldStatus: string | null | undefined, config: MigrationConfig, warn: (m: string) => void): string {
  if (!oldStatus) {
    warn(`status が未指定のため active に変換`);
    return 'active';
  }
  const mapped = config.statusMap[oldStatus];
  if (!mapped) {
    warn(`未知の status='${oldStatus}' → active に変換`);
    return 'active';
  }
  return mapped;
}

function mapLinkType(oldType: string | null | undefined, config: MigrationConfig, warn: (m: string) => void): string {
  if (!oldType) return 'other';
  const mapped = config.linkTypeMap[oldType];
  if (!mapped) {
    warn(`未知の link_type='${oldType}' → other に変換`);
    return 'other';
  }
  return mapped;
}

// --------------- マッピング処理本体 ---------------

type Counters = Record<string, { planned: number; created: number; reused: number; skipped: number }>;

function newCounter(): Counters {
  const tables = [
    'households',
    'users',
    'household_members',
    'categories',
    'locations',
    'home_assets',
    'asset_specs',
    'asset_links',
    'maintenance_records',
    'repair_records',
    'consumables',
    'network_infos',
    'accessories',
    'ai_import_logs',
  ];
  const c: Counters = {};
  for (const t of tables) c[t] = { planned: 0, created: 0, reused: 0, skipped: 0 };
  return c;
}

type RunContext = {
  data: ExportJson;
  config: MigrationConfig;
  isDryRun: boolean;
  warnings: string[];
  errors: string[];
  // 旧ID → 新ID
  idMap: {
    households: Map<string, string>;
    users: Map<string, string>;
    categories: Map<string, string>;
    locations: Map<string, string>;
    home_assets: Map<string, string>;
  };
  counters: Counters;
};

function mkCtx(data: ExportJson, config: MigrationConfig, isDryRun: boolean): RunContext {
  return {
    data,
    config,
    isDryRun,
    warnings: [],
    errors: [],
    idMap: {
      households: new Map(),
      users: new Map(),
      categories: new Map(),
      locations: new Map(),
      home_assets: new Map(),
    },
    counters: newCounter(),
  };
}

function addWarn(ctx: RunContext, msg: string) {
  ctx.warnings.push(msg);
}

async function loadExistingMappings(tx: Prisma.TransactionClient, migrationName: string, ctx: RunContext) {
  const rows = await tx.migrationMapping.findMany({ where: { migrationName } });
  for (const r of rows) {
    const m = (ctx.idMap as Record<string, Map<string, string>>)[r.sourceTable];
    if (m) m.set(r.sourceId, r.targetId);
  }
}

async function recordMapping(
  tx: Prisma.TransactionClient,
  ctx: RunContext,
  sourceTable: string,
  sourceId: string,
  targetTable: string,
  targetId: string,
) {
  if (ctx.isDryRun) return;
  await tx.migrationMapping.upsert({
    where: {
      uniq_mapping: {
        migrationName: ctx.config.migrationName,
        sourceTable,
        sourceId,
        targetTable,
      },
    },
    create: {
      migrationName: ctx.config.migrationName,
      sourceTable,
      sourceId,
      targetTable,
      targetId,
    },
    update: { targetId },
  });
}

// ---- households ----
async function migrateHouseholds(tx: Prisma.TransactionClient, ctx: RunContext) {
  for (const h of ctx.data.households ?? []) {
    ctx.counters.households.planned++;
    if (ctx.idMap.households.has(h.id)) {
      ctx.counters.households.reused++;
      continue;
    }
    const existing = await tx.household.findUnique({ where: { id: h.id } });
    if (existing) {
      ctx.idMap.households.set(h.id, existing.id);
      await recordMapping(tx, ctx, 'households', h.id, 'households', existing.id);
      ctx.counters.households.reused++;
      continue;
    }
    if (!ctx.isDryRun) {
      const created = await tx.household.create({
        data: {
          id: h.id, // 旧IDを引き継ぐ
          name: h.name,
          createdAt: parseDateOrNull(h.created_at) ?? new Date(),
          updatedAt: parseDateOrNull(h.updated_at) ?? new Date(),
        },
      });
      ctx.idMap.households.set(h.id, created.id);
      await recordMapping(tx, ctx, 'households', h.id, 'households', created.id);
    } else {
      ctx.idMap.households.set(h.id, h.id);
    }
    ctx.counters.households.created++;
  }
}

// ---- users ----
async function migrateUsers(tx: Prisma.TransactionClient, ctx: RunContext) {
  for (const u of ctx.data.users ?? []) {
    ctx.counters.users.planned++;
    const existingByEmail = await tx.user.findUnique({ where: { email: u.email } });
    if (existingByEmail) {
      ctx.idMap.users.set(u.id, existingByEmail.id);
      await recordMapping(tx, ctx, 'users', u.id, 'users', existingByEmail.id);
      ctx.counters.users.reused++;
      addWarn(ctx, `users: email='${u.email}' は既存ユーザーを再利用 (id=${existingByEmail.id})`);
      continue;
    }
    if (!ctx.isDryRun) {
      const created = await tx.user.create({
        data: {
          id: u.id,
          email: u.email,
          name: u.name,
          passwordHash: u.password_hash,
          createdAt: parseDateOrNull(u.created_at) ?? new Date(),
          updatedAt: parseDateOrNull(u.updated_at) ?? new Date(),
        },
      });
      ctx.idMap.users.set(u.id, created.id);
      await recordMapping(tx, ctx, 'users', u.id, 'users', created.id);
    } else {
      ctx.idMap.users.set(u.id, u.id);
    }
    ctx.counters.users.created++;
  }
}

// ---- household_members ----
async function migrateHouseholdMembers(tx: Prisma.TransactionClient, ctx: RunContext) {
  for (const m of ctx.data.household_members ?? []) {
    ctx.counters.household_members.planned++;
    const newHouseholdId = ctx.idMap.households.get(m.household_id);
    const newUserId = ctx.idMap.users.get(m.user_id);
    if (!newHouseholdId || !newUserId) {
      addWarn(ctx, `household_members: 参照が解決できずスキップ id=${m.id}`);
      ctx.counters.household_members.skipped++;
      continue;
    }
    const existing = await tx.householdMember.findUnique({
      where: { householdId_userId: { householdId: newHouseholdId, userId: newUserId } },
    });
    if (existing) {
      ctx.counters.household_members.reused++;
      await recordMapping(tx, ctx, 'household_members', m.id, 'household_members', existing.id);
      continue;
    }
    if (!ctx.isDryRun) {
      const created = await tx.householdMember.create({
        data: {
          id: m.id,
          householdId: newHouseholdId,
          userId: newUserId,
          role: m.role,
          createdAt: parseDateOrNull(m.created_at) ?? new Date(),
          updatedAt: parseDateOrNull(m.updated_at) ?? new Date(),
        },
      });
      await recordMapping(tx, ctx, 'household_members', m.id, 'household_members', created.id);
    }
    ctx.counters.household_members.created++;
  }
}

// ---- categories ----
async function migrateCategories(tx: Prisma.TransactionClient, ctx: RunContext) {
  for (const c of ctx.data.categories ?? []) {
    ctx.counters.categories.planned++;
    const newHouseholdId = ctx.idMap.households.get(c.household_id);
    if (!newHouseholdId) {
      addWarn(ctx, `categories: household 未解決でスキップ id=${c.id}`);
      ctx.counters.categories.skipped++;
      continue;
    }
    const assetType = inferAssetTypeFromCategory(c.name, ctx.config);
    // 同一household_id+nameは再利用
    const existing = await tx.category.findUnique({
      where: { householdId_name: { householdId: newHouseholdId, name: c.name } },
    });
    if (existing) {
      ctx.idMap.categories.set(c.id, existing.id);
      await recordMapping(tx, ctx, 'categories', c.id, 'categories', existing.id);
      ctx.counters.categories.reused++;
      continue;
    }
    if (!ctx.isDryRun) {
      const created = await tx.category.create({
        data: {
          id: c.id,
          householdId: newHouseholdId,
          name: c.name,
          assetType,
          icon: c.icon,
          sortOrder: c.sort_order ?? 0,
          createdAt: parseDateOrNull(c.created_at) ?? new Date(),
          updatedAt: parseDateOrNull(c.updated_at) ?? new Date(),
        },
      });
      ctx.idMap.categories.set(c.id, created.id);
      await recordMapping(tx, ctx, 'categories', c.id, 'categories', created.id);
    } else {
      ctx.idMap.categories.set(c.id, c.id);
    }
    ctx.counters.categories.created++;
    log.info(`category: '${c.name}' → asset_type=${assetType}`);
  }
}

// ---- locations ----
async function migrateLocations(tx: Prisma.TransactionClient, ctx: RunContext) {
  // 親を先に処理するため、parent_id=null → parent_id!=null の順
  const list = (ctx.data.locations ?? []).slice().sort((a, b) => {
    const av = a.parent_id ? 1 : 0;
    const bv = b.parent_id ? 1 : 0;
    return av - bv;
  });
  for (const l of list) {
    ctx.counters.locations.planned++;
    const newHouseholdId = ctx.idMap.households.get(l.household_id);
    if (!newHouseholdId) {
      addWarn(ctx, `locations: household 未解決でスキップ id=${l.id}`);
      ctx.counters.locations.skipped++;
      continue;
    }
    const newParentId = l.parent_id ? ctx.idMap.locations.get(l.parent_id) ?? null : null;
    if (l.parent_id && !newParentId) {
      addWarn(ctx, `locations: parent 未解決のため parent=null で作成 id=${l.id}`);
    }
    const existing = await tx.location.findUnique({
      where: { householdId_name: { householdId: newHouseholdId, name: l.name } },
    });
    if (existing) {
      ctx.idMap.locations.set(l.id, existing.id);
      await recordMapping(tx, ctx, 'locations', l.id, 'locations', existing.id);
      ctx.counters.locations.reused++;
      continue;
    }
    if (!ctx.isDryRun) {
      const created = await tx.location.create({
        data: {
          id: l.id,
          householdId: newHouseholdId,
          name: l.name,
          parentId: newParentId,
          memo: l.memo,
          sortOrder: l.sort_order ?? 0,
          createdAt: parseDateOrNull(l.created_at) ?? new Date(),
          updatedAt: parseDateOrNull(l.updated_at) ?? new Date(),
        },
      });
      ctx.idMap.locations.set(l.id, created.id);
      await recordMapping(tx, ctx, 'locations', l.id, 'locations', created.id);
    } else {
      ctx.idMap.locations.set(l.id, l.id);
    }
    ctx.counters.locations.created++;
  }
}

// ---- devices → home_assets ----
async function migrateHomeAssets(tx: Prisma.TransactionClient, ctx: RunContext) {
  const categoryNameById = new Map<string, string>();
  for (const c of ctx.data.categories ?? []) categoryNameById.set(c.id, c.name);

  for (const d of ctx.data.devices ?? []) {
    ctx.counters.home_assets.planned++;
    const newHouseholdId = ctx.idMap.households.get(d.household_id);
    if (!newHouseholdId) {
      addWarn(ctx, `home_assets: household 未解決でスキップ id=${d.id}`);
      ctx.counters.home_assets.skipped++;
      continue;
    }
    // 既に移行済みか
    const existingMapping = ctx.idMap.home_assets.get(d.id);
    if (existingMapping) {
      ctx.counters.home_assets.reused++;
      continue;
    }
    const newCategoryId = d.category_id ? ctx.idMap.categories.get(d.category_id) ?? null : null;
    if (d.category_id && !newCategoryId) {
      addWarn(ctx, `home_assets: category_id='${d.category_id}' 未解決 → null (asset=${d.name})`);
    }
    const newLocationId = d.location_id ? ctx.idMap.locations.get(d.location_id) ?? null : null;
    if (d.location_id && !newLocationId) {
      addWarn(ctx, `home_assets: location_id='${d.location_id}' 未解決 → null (asset=${d.name})`);
    }
    const categoryName = d.category_id ? categoryNameById.get(d.category_id) ?? null : null;
    const assetType = inferAssetTypeFromCategory(categoryName, ctx.config);
    const status = mapStatus(d.status, ctx.config, (m) => addWarn(ctx, `home_assets[${d.name}]: ${m}`));
    const priority = d.priority ?? 'medium';

    if (d.installation_photo_url) {
      addWarn(ctx, `home_assets[${d.name}]: installation_photo_url は新DB列が無いため memo に追記`);
    }

    let memo = d.memo ?? null;
    if (d.installation_photo_url) {
      memo = (memo ? memo + '\n' : '') + `[migration] installation_photo_url=${d.installation_photo_url}`;
    }

    if (!ctx.isDryRun) {
      const created = await tx.homeAsset.create({
        data: {
          id: d.id,
          householdId: newHouseholdId,
          assetType,
          name: d.name,
          categoryId: newCategoryId,
          manufacturer: d.manufacturer,
          modelNumber: d.model_number,
          serialNumber: d.serial_number,
          locationId: newLocationId,
          status,
          priority,
          purchaseDate: parseDateOrNull(d.purchase_date),
          purchaseStore: d.purchase_store,
          purchasePrice: parseDecimalOrNull(d.purchase_price),
          purchaseUrl: d.purchase_url,
          orderNumber: d.order_number,
          receiptUrl: d.receipt_url ?? null,
          warrantyStartDate: parseDateOrNull(d.warranty_start_date),
          warrantyEndDate: parseDateOrNull(d.warranty_end_date),
          hasExtendedWarranty: d.has_extended_warranty ?? false,
          warrantyMemo: d.warranty_memo,
          manualUrl: d.manual_url,
          officialUrl: d.official_url,
          supportUrl: d.support_url,
          photoUrl: d.photo_url,
          labelPhotoUrl: d.label_photo_url,
          memo,
          createdAt: parseDateOrNull(d.created_at) ?? new Date(),
          updatedAt: parseDateOrNull(d.updated_at) ?? new Date(),
          deletedAt: parseDateOrNull(d.deleted_at),
        },
      });
      ctx.idMap.home_assets.set(d.id, created.id);
      await recordMapping(tx, ctx, 'devices', d.id, 'home_assets', created.id);
    } else {
      ctx.idMap.home_assets.set(d.id, d.id);
    }
    ctx.counters.home_assets.created++;
  }
}

// 共通: device_id → asset_id 解決
function resolveAssetId(ctx: RunContext, deviceId: string, contextLabel: string): string | null {
  const newId = ctx.idMap.home_assets.get(deviceId);
  if (!newId) {
    addWarn(ctx, `${contextLabel}: device_id='${deviceId}' に対応する asset_id が無く スキップ`);
    return null;
  }
  return newId;
}

async function migrateAssetSpecs(tx: Prisma.TransactionClient, ctx: RunContext) {
  for (const s of ctx.data.device_specs ?? []) {
    ctx.counters.asset_specs.planned++;
    const householdId = ctx.idMap.households.get(s.household_id);
    const assetId = resolveAssetId(ctx, s.device_id, 'asset_specs');
    if (!householdId || !assetId) {
      ctx.counters.asset_specs.skipped++;
      continue;
    }
    if (!ctx.isDryRun) {
      const existing = await tx.migrationMapping.findUnique({
        where: {
          uniq_mapping: {
            migrationName: ctx.config.migrationName,
            sourceTable: 'device_specs',
            sourceId: s.id,
            targetTable: 'asset_specs',
          },
        },
      });
      if (existing) {
        ctx.counters.asset_specs.reused++;
        continue;
      }
      const created = await tx.assetSpec.create({
        data: {
          id: s.id,
          householdId,
          assetId,
          specName: s.spec_name,
          specValue: s.spec_value,
          unit: s.unit,
          memo: s.memo,
          sortOrder: s.sort_order ?? 0,
          createdAt: parseDateOrNull(s.created_at) ?? new Date(),
          updatedAt: parseDateOrNull(s.updated_at) ?? new Date(),
        },
      });
      await recordMapping(tx, ctx, 'device_specs', s.id, 'asset_specs', created.id);
    }
    ctx.counters.asset_specs.created++;
  }
}

async function migrateAssetLinks(tx: Prisma.TransactionClient, ctx: RunContext) {
  for (const l of ctx.data.device_links ?? []) {
    ctx.counters.asset_links.planned++;
    const householdId = ctx.idMap.households.get(l.household_id);
    const assetId = resolveAssetId(ctx, l.device_id, 'asset_links');
    if (!householdId || !assetId) {
      ctx.counters.asset_links.skipped++;
      continue;
    }
    const linkType = mapLinkType(l.link_type, ctx.config, (m) => addWarn(ctx, `asset_links[${l.id}]: ${m}`));
    if (!ctx.isDryRun) {
      const existing = await tx.migrationMapping.findUnique({
        where: {
          uniq_mapping: {
            migrationName: ctx.config.migrationName,
            sourceTable: 'device_links',
            sourceId: l.id,
            targetTable: 'asset_links',
          },
        },
      });
      if (existing) {
        ctx.counters.asset_links.reused++;
        continue;
      }
      const created = await tx.assetLink.create({
        data: {
          id: l.id,
          householdId,
          assetId,
          linkType,
          title: l.title,
          url: l.url,
          memo: l.memo,
          createdAt: parseDateOrNull(l.created_at) ?? new Date(),
          updatedAt: parseDateOrNull(l.updated_at) ?? new Date(),
        },
      });
      await recordMapping(tx, ctx, 'device_links', l.id, 'asset_links', created.id);
    }
    ctx.counters.asset_links.created++;
  }
}

async function migrateMaintenanceRecords(tx: Prisma.TransactionClient, ctx: RunContext) {
  for (const m of ctx.data.maintenance_records ?? []) {
    ctx.counters.maintenance_records.planned++;
    const householdId = ctx.idMap.households.get(m.household_id);
    const assetId = resolveAssetId(ctx, m.device_id, 'maintenance_records');
    if (!householdId || !assetId) {
      ctx.counters.maintenance_records.skipped++;
      continue;
    }
    if (!ctx.isDryRun) {
      const existing = await tx.migrationMapping.findUnique({
        where: {
          uniq_mapping: {
            migrationName: ctx.config.migrationName,
            sourceTable: 'maintenance_records',
            sourceId: m.id,
            targetTable: 'maintenance_records',
          },
        },
      });
      if (existing) {
        ctx.counters.maintenance_records.reused++;
        continue;
      }
      const created = await tx.maintenanceRecord.create({
        data: {
          id: m.id,
          householdId,
          assetId,
          maintenanceDate: parseDateOrNull(m.maintenance_date) ?? new Date(),
          maintenanceType: m.maintenance_type,
          description: m.description,
          cost: parseDecimalOrNull(m.cost),
          performedBy: m.performed_by,
          nextDueDate: parseDateOrNull(m.next_due_date),
          photoUrl: m.photo_url,
          memo: m.memo,
          createdAt: parseDateOrNull(m.created_at) ?? new Date(),
          updatedAt: parseDateOrNull(m.updated_at) ?? new Date(),
        },
      });
      await recordMapping(tx, ctx, 'maintenance_records', m.id, 'maintenance_records', created.id);
    }
    ctx.counters.maintenance_records.created++;
  }
}

async function migrateRepairRecords(tx: Prisma.TransactionClient, ctx: RunContext) {
  for (const r of ctx.data.repair_records ?? []) {
    ctx.counters.repair_records.planned++;
    const householdId = ctx.idMap.households.get(r.household_id);
    const assetId = resolveAssetId(ctx, r.device_id, 'repair_records');
    if (!householdId || !assetId) {
      ctx.counters.repair_records.skipped++;
      continue;
    }
    if (!ctx.isDryRun) {
      const existing = await tx.migrationMapping.findUnique({
        where: {
          uniq_mapping: {
            migrationName: ctx.config.migrationName,
            sourceTable: 'repair_records',
            sourceId: r.id,
            targetTable: 'repair_records',
          },
        },
      });
      if (existing) {
        ctx.counters.repair_records.reused++;
        continue;
      }
      const created = await tx.repairRecord.create({
        data: {
          id: r.id,
          householdId,
          assetId,
          occurredDate: parseDateOrNull(r.occurred_date) ?? new Date(),
          symptom: r.symptom,
          cause: r.cause,
          actionTaken: r.action_taken,
          vendorName: r.repair_vendor, // 名称変更
          ticketNumber: r.repair_ticket_number, // 名称変更
          cost: parseDecimalOrNull(r.cost),
          usedWarranty: r.used_warranty ?? false,
          completedDate: parseDateOrNull(r.completed_date),
          status: r.status ?? 'pending',
          memo: r.memo,
          createdAt: parseDateOrNull(r.created_at) ?? new Date(),
          updatedAt: parseDateOrNull(r.updated_at) ?? new Date(),
        },
      });
      await recordMapping(tx, ctx, 'repair_records', r.id, 'repair_records', created.id);
    }
    ctx.counters.repair_records.created++;
  }
}

async function migrateConsumables(tx: Prisma.TransactionClient, ctx: RunContext) {
  for (const c of ctx.data.consumables ?? []) {
    ctx.counters.consumables.planned++;
    const householdId = ctx.idMap.households.get(c.household_id);
    const assetId = resolveAssetId(ctx, c.device_id, 'consumables');
    if (!householdId || !assetId) {
      ctx.counters.consumables.skipped++;
      continue;
    }
    if (!ctx.isDryRun) {
      const existing = await tx.migrationMapping.findUnique({
        where: {
          uniq_mapping: {
            migrationName: ctx.config.migrationName,
            sourceTable: 'consumables',
            sourceId: c.id,
            targetTable: 'consumables',
          },
        },
      });
      if (existing) {
        ctx.counters.consumables.reused++;
        continue;
      }
      const created = await tx.consumable.create({
        data: {
          id: c.id,
          householdId,
          assetId,
          name: c.name,
          manufacturer: c.manufacturer,
          modelNumber: c.model_number,
          replacementIntervalText: c.replacement_interval_text,
          lastReplacedDate: parseDateOrNull(c.last_replaced_date),
          nextReplacementDate: parseDateOrNull(c.next_replacement_date),
          purchaseUrl: c.purchase_url,
          memo: c.memo,
          createdAt: parseDateOrNull(c.created_at) ?? new Date(),
          updatedAt: parseDateOrNull(c.updated_at) ?? new Date(),
        },
      });
      await recordMapping(tx, ctx, 'consumables', c.id, 'consumables', created.id);
    }
    ctx.counters.consumables.created++;
  }
}

async function migrateNetworkInfos(tx: Prisma.TransactionClient, ctx: RunContext) {
  for (const n of ctx.data.network_infos ?? []) {
    ctx.counters.network_infos.planned++;
    const householdId = ctx.idMap.households.get(n.household_id);
    const assetId = resolveAssetId(ctx, n.device_id, 'network_infos');
    if (!householdId || !assetId) {
      ctx.counters.network_infos.skipped++;
      continue;
    }
    if (!ctx.isDryRun) {
      const existing = await tx.migrationMapping.findUnique({
        where: {
          uniq_mapping: {
            migrationName: ctx.config.migrationName,
            sourceTable: 'network_infos',
            sourceId: n.id,
            targetTable: 'network_infos',
          },
        },
      });
      if (existing) {
        ctx.counters.network_infos.reused++;
        continue;
      }
      const created = await tx.networkInfo.create({
        data: {
          id: n.id,
          householdId,
          assetId,
          ipAddress: n.ip_address,
          hostName: n.host_name,
          macAddress: n.mac_address,
          adminUrl: n.admin_url,
          port: n.port,
          connectionType: n.connection_type,
          credentialStorageMemo: n.credential_storage_memo,
          settingsMemo: n.settings_memo,
          createdAt: parseDateOrNull(n.created_at) ?? new Date(),
          updatedAt: parseDateOrNull(n.updated_at) ?? new Date(),
        },
      });
      await recordMapping(tx, ctx, 'network_infos', n.id, 'network_infos', created.id);
    }
    ctx.counters.network_infos.created++;
  }
}

async function migrateAccessories(tx: Prisma.TransactionClient, ctx: RunContext) {
  for (const a of ctx.data.accessories ?? []) {
    ctx.counters.accessories.planned++;
    const householdId = ctx.idMap.households.get(a.household_id);
    const assetId = resolveAssetId(ctx, a.device_id, 'accessories');
    if (!householdId || !assetId) {
      ctx.counters.accessories.skipped++;
      continue;
    }
    if (!ctx.isDryRun) {
      const existing = await tx.migrationMapping.findUnique({
        where: {
          uniq_mapping: {
            migrationName: ctx.config.migrationName,
            sourceTable: 'accessories',
            sourceId: a.id,
            targetTable: 'accessories',
          },
        },
      });
      if (existing) {
        ctx.counters.accessories.reused++;
        continue;
      }
      const created = await tx.accessory.create({
        data: {
          id: a.id,
          householdId,
          assetId,
          name: a.name,
          quantity: a.quantity,
          storageLocation: a.storage_location,
          memo: a.memo,
          createdAt: parseDateOrNull(a.created_at) ?? new Date(),
          updatedAt: parseDateOrNull(a.updated_at) ?? new Date(),
        },
      });
      await recordMapping(tx, ctx, 'accessories', a.id, 'accessories', created.id);
    }
    ctx.counters.accessories.created++;
  }
}

async function migrateAiImportLogs(tx: Prisma.TransactionClient, ctx: RunContext) {
  for (const l of ctx.data.ai_import_logs ?? []) {
    ctx.counters.ai_import_logs.planned++;
    const householdId = ctx.idMap.households.get(l.household_id);
    if (!householdId) {
      ctx.counters.ai_import_logs.skipped++;
      continue;
    }
    const assetId = l.device_id ? ctx.idMap.home_assets.get(l.device_id) ?? null : null;
    if (l.device_id && !assetId) {
      addWarn(ctx, `ai_import_logs[${l.id}]: device_id='${l.device_id}' 未解決 → asset_id=null`);
    }
    if (!ctx.isDryRun) {
      const existing = await tx.migrationMapping.findUnique({
        where: {
          uniq_mapping: {
            migrationName: ctx.config.migrationName,
            sourceTable: 'ai_import_logs',
            sourceId: l.id,
            targetTable: 'ai_import_logs',
          },
        },
      });
      if (existing) {
        ctx.counters.ai_import_logs.reused++;
        continue;
      }
      const created = await tx.aiImportLog.create({
        data: {
          id: l.id,
          householdId,
          assetId,
          sourceAiName: l.source_ai_name,
          inputPrompt: l.input_prompt,
          rawResponse: l.raw_response,
          parsedJson: (l.parsed_json as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
          importedAt: parseDateOrNull(l.imported_at) ?? new Date(),
          memo: l.memo,
        },
      });
      await recordMapping(tx, ctx, 'ai_import_logs', l.id, 'ai_import_logs', created.id);
    }
    ctx.counters.ai_import_logs.created++;
  }
}

// --------------- 検証(verify) ---------------

async function verify(prisma: PrismaClient, data: ExportJson, migrationName: string) {
  log.section('件数チェック');
  const counts = {
    home_assets: await prisma.homeAsset.count(),
    asset_specs: await prisma.assetSpec.count(),
    asset_links: await prisma.assetLink.count(),
    maintenance_records: await prisma.maintenanceRecord.count(),
    repair_records: await prisma.repairRecord.count(),
    consumables: await prisma.consumable.count(),
    network_infos: await prisma.networkInfo.count(),
    accessories: await prisma.accessory.count(),
    ai_import_logs: await prisma.aiImportLog.count(),
    categories: await prisma.category.count(),
    locations: await prisma.location.count(),
  };
  const old = {
    home_assets: (data.devices ?? []).length,
    asset_specs: (data.device_specs ?? []).length,
    asset_links: (data.device_links ?? []).length,
    maintenance_records: (data.maintenance_records ?? []).length,
    repair_records: (data.repair_records ?? []).length,
    consumables: (data.consumables ?? []).length,
    network_infos: (data.network_infos ?? []).length,
    accessories: (data.accessories ?? []).length,
    ai_import_logs: (data.ai_import_logs ?? []).length,
    categories: (data.categories ?? []).length,
    locations: (data.locations ?? []).length,
  };
  let ok = true;
  for (const key of Object.keys(counts) as (keyof typeof counts)[]) {
    const delta = counts[key] - old[key];
    const mark = delta === 0 ? '✓' : delta > 0 ? '⚠ 新>旧' : '✗ 新<旧';
    if (delta < 0) ok = false;
    console.log(`  ${mark} ${key.padEnd(22)} old=${old[key]}  new=${counts[key]}`);
  }

  log.section('参照整合性チェック');
  // 子テーブルの asset_id が home_assets.id に存在しないレコードを生SQLでカウント
  const orphanTables: { name: string; table: string }[] = [
    { name: 'asset_specs', table: 'asset_specs' },
    { name: 'asset_links', table: 'asset_links' },
    { name: 'maintenance_records', table: 'maintenance_records' },
    { name: 'repair_records', table: 'repair_records' },
    { name: 'consumables', table: 'consumables' },
    { name: 'network_infos', table: 'network_infos' },
    { name: 'accessories', table: 'accessories' },
  ];
  for (const { name, table } of orphanTables) {
    const rows = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
      `SELECT COUNT(*)::bigint AS cnt FROM "${table}" c WHERE NOT EXISTS (SELECT 1 FROM home_assets h WHERE h.id = c.asset_id)`,
    );
    const n = Number(rows[0]?.cnt ?? 0n);
    const mark = n === 0 ? '✓' : '✗';
    if (n > 0) ok = false;
    console.log(`  ${mark} ${name.padEnd(22)} 親なし=${n}`);
  }
  // home_assets の category_id / location_id が存在することも確認
  const catOrphan = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
    `SELECT COUNT(*)::bigint AS cnt FROM home_assets h WHERE h.category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = h.category_id)`,
  );
  const locOrphan = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
    `SELECT COUNT(*)::bigint AS cnt FROM home_assets h WHERE h.location_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM locations l WHERE l.id = h.location_id)`,
  );
  const c1 = Number(catOrphan[0]?.cnt ?? 0n);
  const c2 = Number(locOrphan[0]?.cnt ?? 0n);
  if (c1 > 0 || c2 > 0) ok = false;
  console.log(`  ${c1 === 0 ? '✓' : '✗'} home_assets.category_id 親なし=${c1}`);
  console.log(`  ${c2 === 0 ? '✓' : '✗'} home_assets.location_id 親なし=${c2}`);

  log.section('migration_mappings サマリ');
  const mGroup = await prisma.migrationMapping.groupBy({
    by: ['sourceTable'],
    where: { migrationName },
    _count: { _all: true },
  });
  for (const g of mGroup) {
    console.log(`  ${g.sourceTable.padEnd(22)} 対応件数=${g._count._all}`);
  }
  console.log('');
  if (ok) log.info('verify: OK');
  else log.error('verify: 問題あり（上記参照）');
  return ok;
}

// --------------- メイン ---------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  const configPath = args.configPath;
  const config: MigrationConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  log.info(`migration_name = ${config.migrationName}`);
  log.info(`mode = ${args.mode}`);

  // verify は input 必須でなくても件数チェックだけは可能だが、より詳しい比較のため要求
  if (args.mode === 'verify') {
    if (!args.inputPath) throw new Error('--verify には --input が必要です');
    const data = JSON.parse(fs.readFileSync(args.inputPath, 'utf-8'));
    validateExportJson(data);
    const ok = await verify(prisma, data, config.migrationName);
    await prisma.$disconnect();
    process.exit(ok ? 0 : 1);
  }

  if (!args.inputPath) throw new Error('--input <json> を指定してください');
  const rawData = JSON.parse(fs.readFileSync(args.inputPath, 'utf-8'));
  validateExportJson(rawData);
  const data: ExportJson = rawData;

  log.info(`input = ${path.resolve(args.inputPath)}`);
  log.info(`exported_at = ${data.exported_at}`);
  log.info(`source_app = ${data.source_app} / schema_version = ${data.schema_version}`);

  const isDryRun = args.mode === 'dry-run';
  if (!isDryRun) {
    log.warn('execute モード: 実DB に書き込みます。事前にバックアップを取ってください。');
  }
  const ctx = mkCtx(data, config, isDryRun);

  const logRow = await prisma.migrationLog.create({
    data: {
      migrationName: config.migrationName,
      mode: args.mode,
      status: 'partial',
    },
  });

  try {
    await prisma.$transaction(
      async (tx) => {
        await loadExistingMappings(tx, config.migrationName, ctx);
        log.section('households');
        await migrateHouseholds(tx, ctx);
        log.section('users');
        await migrateUsers(tx, ctx);
        log.section('household_members');
        await migrateHouseholdMembers(tx, ctx);
        log.section('categories');
        await migrateCategories(tx, ctx);
        log.section('locations');
        await migrateLocations(tx, ctx);
        log.section('home_assets');
        await migrateHomeAssets(tx, ctx);
        log.section('asset_specs');
        await migrateAssetSpecs(tx, ctx);
        log.section('asset_links');
        await migrateAssetLinks(tx, ctx);
        log.section('maintenance_records');
        await migrateMaintenanceRecords(tx, ctx);
        log.section('repair_records');
        await migrateRepairRecords(tx, ctx);
        log.section('consumables');
        await migrateConsumables(tx, ctx);
        log.section('network_infos');
        await migrateNetworkInfos(tx, ctx);
        log.section('accessories');
        await migrateAccessories(tx, ctx);
        log.section('ai_import_logs');
        await migrateAiImportLogs(tx, ctx);

        if (isDryRun) {
          // dry-run は何も書き込まないので、トランザクションをロールバック
          throw new DryRunRollback();
        }
      },
      { timeout: 300000, maxWait: 30000 },
    );

    await prisma.migrationLog.update({
      where: { id: logRow.id },
      data: {
        status: 'success',
        finishedAt: new Date(),
        summaryJson: {
          counters: ctx.counters,
          warnings: ctx.warnings.slice(0, 200),
          warningCount: ctx.warnings.length,
        },
      },
    });
  } catch (err) {
    if (err instanceof DryRunRollback) {
      log.info('dry-run のためトランザクションをロールバックしました（DBへは書き込んでいません）');
      await prisma.migrationLog.update({
        where: { id: logRow.id },
        data: {
          status: 'success',
          finishedAt: new Date(),
          summaryJson: {
            counters: ctx.counters,
            warnings: ctx.warnings.slice(0, 200),
            warningCount: ctx.warnings.length,
          },
        },
      });
    } else {
      ctx.errors.push(String(err));
      log.error('移行に失敗しました:', err);
      await prisma.migrationLog.update({
        where: { id: logRow.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          errorMessage: String(err),
          summaryJson: {
            counters: ctx.counters,
            warnings: ctx.warnings.slice(0, 200),
            warningCount: ctx.warnings.length,
          },
        },
      });
      throw err;
    }
  }

  // ----- サマリ表示 -----
  log.section('サマリ（テーブル別件数）');
  for (const [t, c] of Object.entries(ctx.counters)) {
    console.log(
      `  ${t.padEnd(22)} planned=${c.planned}  created=${c.created}  reused=${c.reused}  skipped=${c.skipped}`,
    );
  }
  console.log(`\n警告件数: ${ctx.warnings.length}`);
  if (ctx.warnings.length > 0) {
    log.section('警告（先頭50件）');
    ctx.warnings.slice(0, 50).forEach((w) => console.log('  -', w));
    // エラーレポート JSON 出力
    const reportDir = path.resolve(__dirname, '../exports');
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, `migration-warnings-${args.mode}-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({ warnings: ctx.warnings, counters: ctx.counters }, null, 2));
    log.info(`警告レポート: ${reportPath}`);
  }

  await prisma.$disconnect();
}

class DryRunRollback extends Error {
  constructor() {
    super('dry-run rollback');
    this.name = 'DryRunRollback';
  }
}

main().catch((err) => {
  log.error(err);
  process.exit(1);
});
