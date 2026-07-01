import { Prisma } from '@prisma/client';
import { formatDateOnly } from './date';

// Prisma結果のJSON返却用整形。日付→'YYYY-MM-DD'、Decimal→number
export function serializeAsset<T extends Record<string, any>>(d: T): T {
  if (!d) return d;
  const out: Record<string, any> = { ...d };
  const dateOnlyFields = [
    'purchaseDate',
    'installedDate',
    'constructionDate',
    'warrantyStartDate',
    'warrantyEndDate',
    'replacementDueDate',
    'maintenanceDate',
    'nextDueDate',
    'occurredDate',
    'completedDate',
    'lastReplacedDate',
    'nextReplacementDate',
  ];
  for (const k of dateOnlyFields) {
    if (out[k] instanceof Date) {
      out[k] = formatDateOnly(out[k]);
    }
  }
  for (const [k, v] of Object.entries(out)) {
    if (v instanceof Prisma.Decimal) {
      // Decimal は数値化してそれ以上の再帰処理はスキップ（内部構造を展開しないため）
      out[k] = v.toNumber();
      continue;
    }
    if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        item && typeof item === 'object' ? serializeAsset(item) : item
      );
    } else if (v && typeof v === 'object' && !(v instanceof Date)) {
      out[k] = serializeAsset(v as Record<string, any>);
    }
  }
  return out as T;
}
