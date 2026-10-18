import {
  ASSET_PRIORITY_LABELS, ASSET_STATUS_LABELS, ASSET_TYPE_LABELS, CONNECTION_TYPE_LABELS,
  LINK_TYPE_LABELS, MAINTENANCE_TYPE_LABELS, REPAIR_STATUS_LABELS,
  type AiExport,
} from '@homeasset/shared';
import { Prisma } from '@prisma/client';
import { formatDateOnly } from './date';

type AnyRecord = Record<string, any>;
type BuildInput = { householdName?: string | null; assets: AnyRecord[] };
type Options = { includeNetwork?: boolean; exportedAt?: Date };

const assetFields = `name assetType status priority manufacturer modelNumber serialNumber purchaseDate installedDate constructionDate purchaseStore contractorName contractorContact contactPerson purchasePrice constructionCost purchaseUrl orderNumber contractNumber receiptUrl constructionDocumentUrl warrantyStartDate warrantyEndDate hasExtendedWarranty warrantyMemo manualUrl officialUrl supportUrl photoUrl labelPhotoUrl beforePhotoUrl afterPhotoUrl expectedLifespanYears replacementDueDate memo`;
const dateFields = new Set(['purchaseDate','installedDate','constructionDate','warrantyStartDate','warrantyEndDate','replacementDueDate','maintenanceDate','nextDueDate','occurredDate','completedDate','lastReplacedDate','nextReplacementDate','generatedAt','deletedAt']);
const omitFields = new Set(['id','householdId','assetId','createdAt','updatedAt','sortOrder','source','schemaVersion','deletedAt','categoryId','locationId']);

function clean(value: unknown): unknown {
  if (value instanceof Date) return formatDateOnly(value);
  if (value instanceof Prisma.Decimal) return value.toNumber();
  if (Array.isArray(value)) {
    const result = value.map(clean).filter((item) => item !== undefined);
    return result.length ? result : undefined;
  }
  if (value && typeof value === 'object') {
    const result: AnyRecord = {};
    for (const [key, item] of Object.entries(value as AnyRecord)) {
      if (omitFields.has(key) || (key === 'usedWarranty' && item !== true) || (key === 'hasExtendedWarranty' && item !== true)) continue;
      const cleaned = clean(item);
      if (cleaned !== undefined && cleaned !== null && cleaned !== '') result[key] = cleaned;
    }
    return Object.keys(result).length ? result : undefined;
  }
  if (value === null || value === '' || value === undefined) return undefined;
  return value;
}

function dateValues(record: AnyRecord): AnyRecord {
  const output = { ...record };
  for (const key of dateFields) if (output[key] instanceof Date) output[key] = formatDateOnly(output[key]);
  return output;
}

export function buildAiExport(input: BuildInput, options: Options = {}): AiExport {
  const includeNetwork = options.includeNetwork === true;
  const assets = [...input.assets].sort((a,b) => String(a.assetType).localeCompare(String(b.assetType)) || (a.category?.sortOrder ?? 0) - (b.category?.sortOrder ?? 0) || String(a.name).localeCompare(String(b.name), 'ja'));
  const byStatus: Record<string, number> = {};
  const byAssetType: Record<string, number> = {};
  const items = assets.map((asset) => {
    byStatus[asset.status] = (byStatus[asset.status] ?? 0) + 1;
    byAssetType[asset.assetType] = (byAssetType[asset.assetType] ?? 0) + 1;
    const row: AnyRecord = { id: asset.id };
    for (const key of assetFields.split(' ')) row[key] = asset[key];
    if (asset.category?.name) row.category = asset.category.name;
    if (asset.location?.name) row.location = asset.location.parent?.name ? `${asset.location.parent.name} > ${asset.location.name}` : asset.location.name;
    if (asset.deletedAt) row.deletedDate = formatDateOnly(asset.deletedAt);
    for (const key of ['specs','links','maintenanceRecords','repairRecords','consumables','accessories']) row[key] = asset[key];
    if (asset.actionPlan) row.actionPlan = dateValues(asset.actionPlan);
    if (includeNetwork && asset.networkInfo) row.networkInfo = asset.networkInfo;
    return { id: asset.id, ...(clean(row) as AnyRecord) };
  });

  const labels: AnyRecord = {
    assetType: ASSET_TYPE_LABELS, status: ASSET_STATUS_LABELS, priority: ASSET_PRIORITY_LABELS,
    linkType: LINK_TYPE_LABELS, maintenanceType: MAINTENANCE_TYPE_LABELS, repairStatus: REPAIR_STATUS_LABELS,
  };
  if (includeNetwork) labels.connectionType = CONNECTION_TYPE_LABELS;
  return {
    format: 'homeasset-ai-export', formatVersion: 1, exportedAt: (options.exportedAt ?? new Date()).toISOString(),
    ...(input.householdName ? { householdName: input.householdName } : {}),
    guide: {
      purpose: '家庭の資産（家電・住宅設備・建物部位・家具・工具など）の登録データです。保証期限・メンテナンス・消耗品交換・更新計画の管理や助言に使ってください。',
      conventions: ['日付は YYYY-MM-DD（exportedAt のみ ISO 8601）','金額は日本円','項目が存在しない場合は未登録を意味する（null や空配列は出力しない）','assets[].id はアプリ内の資産ID。資産について言及するときはこのIDと name を併記してください'],
      networkInfo: includeNetwork ? 'included' : 'excluded', enumLabels: labels,
    },
    summary: { assetCount: assets.length, byStatus, byAssetType }, assets: items,
  };
}
