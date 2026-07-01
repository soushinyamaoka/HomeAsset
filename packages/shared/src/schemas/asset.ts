import { z } from 'zod';
import { ASSET_PRIORITIES, ASSET_STATUSES, ASSET_TYPES } from '../constants';
import { optionalDate, optionalNonNegativeNumber, optionalString, optionalUrl } from './common';

// home_assets 登録・編集スキーマ
export const assetInputSchema = z
  .object({
    name: z.string().trim().min(1, '名称を入力してください'),
    assetType: z.enum(ASSET_TYPES).default('device'),
    categoryId: z.string().optional().nullable(),
    manufacturer: optionalString,
    modelNumber: optionalString,
    serialNumber: optionalString,
    locationId: z.string().optional().nullable(),
    status: z.enum(ASSET_STATUSES).default('active'),
    priority: z.enum(ASSET_PRIORITIES).default('medium'),

    // 購入・設置・施工
    purchaseDate: optionalDate,
    installedDate: optionalDate,
    constructionDate: optionalDate,
    purchaseStore: optionalString,
    contractorName: optionalString,
    contractorContact: optionalString,
    contactPerson: optionalString,
    purchasePrice: optionalNonNegativeNumber,
    constructionCost: optionalNonNegativeNumber,
    purchaseUrl: optionalUrl,
    orderNumber: optionalString,
    contractNumber: optionalString,
    receiptUrl: optionalUrl,
    constructionDocumentUrl: optionalUrl,

    // 保証
    warrantyStartDate: optionalDate,
    warrantyEndDate: optionalDate,
    hasExtendedWarranty: z.boolean().optional(),
    warrantyMemo: optionalString,

    // 取扱説明書・サポート
    manualUrl: optionalUrl,
    supportUrl: optionalUrl,
    officialUrl: optionalUrl,

    // 写真
    photoUrl: optionalUrl,
    labelPhotoUrl: optionalUrl,
    beforePhotoUrl: optionalUrl,
    afterPhotoUrl: optionalUrl,

    // 寿命・交換予定
    expectedLifespanYears: optionalNonNegativeNumber,
    replacementDueDate: optionalDate,

    memo: z
      .string()
      .optional()
      .or(z.literal('').transform(() => undefined)),
  })
  .superRefine((val, ctx) => {
    if (val.warrantyStartDate && val.warrantyEndDate && val.warrantyEndDate < val.warrantyStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['warrantyEndDate'],
        message: '保証終了日は保証開始日以降にしてください',
      });
    }
  });

export type AssetInput = z.infer<typeof assetInputSchema>;

// 一覧検索クエリ
export const assetListQuerySchema = z.object({
  search: z.string().optional(),
  assetType: z.enum(ASSET_TYPES).optional(),
  categoryId: z.string().optional(),
  locationId: z.string().optional(),
  status: z.enum(ASSET_STATUSES).optional(),
  warrantyFilter: z.enum(['expiring_soon', 'expired', 'none']).optional(),
  sort: z
    .enum([
      'created_desc',
      'updated_desc',
      'name_asc',
      'warranty_asc',
      'purchase_desc',
      'installed_desc',
      'construction_desc',
      'next_maintenance_asc',
    ])
    .default('updated_desc')
    .optional(),
  includeDisposed: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === 'true')
    .optional(),
});

export type AssetListQuery = z.infer<typeof assetListQuerySchema>;
