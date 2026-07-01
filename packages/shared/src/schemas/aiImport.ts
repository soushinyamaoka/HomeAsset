import { z } from 'zod';
import { ASSET_PRIORITIES, ASSET_STATUSES, ASSET_TYPES } from '../constants';

// AI 出力に混入しがちな URL 表記の揺れを吸収する。
// - Markdown リンク [表示文字](URL) → URL 部分を取り出す
// - <URL> の山括弧囲みを除去
// 文字列以外（null/undefined/数値等）はそのまま返す。
function extractUrl(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  let s = raw.trim();
  const md = s.match(/^\[[^\]]*\]\(([^)]+)\)$/);
  if (md) {
    s = md[1].trim().split(/\s+/)[0]; // (URL "タイトル") の余分なタイトルを除去
  }
  s = s.replace(/^<([\s\S]*)>$/, '$1').trim();
  return s;
}

// AI 出力 JSON 用（緩め）
const optionalString = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v == null || v === '' ? undefined : v));

const optionalUrl = z
  .preprocess(extractUrl, z.union([z.string().url(), z.literal('')]))
  .optional()
  .nullable()
  .transform((v) => (v == null || v === '' ? undefined : v));

export const aiImportPayloadSchema = z.object({
  asset: z
    .object({
      name: optionalString,
      asset_type: z.enum(ASSET_TYPES).optional().nullable(),
      manufacturer: optionalString,
      model_number: optionalString,
      category_suggestion: optionalString,
      summary: optionalString,
    })
    .partial()
    .optional(),

  specs: z
    .array(
      z.object({
        spec_name: z.string().min(1, 'spec_name は必須です'),
        spec_value: optionalString,
        unit: optionalString,
        memo: optionalString,
      })
    )
    .optional(),

  links: z
    .preprocess(
      // url が空 / null / 未指定（Markdown崩れ含む）のリンクは検証前に除外する。
      // データモデル上リンクは url 必須のため、URL の無いリンクは取り込み対象外。
      (val) => {
        if (!Array.isArray(val)) return val;
        return val.filter((item) => {
          if (item == null || typeof item !== 'object') return false;
          const u = extractUrl((item as { url?: unknown }).url);
          return typeof u === 'string' && u.length > 0;
        });
      },
      z.array(
        z.object({
          link_type: z
            .enum([
              'official',
              'manual',
              'support',
              'purchase',
              'warranty',
              'construction_document',
              'other',
            ])
            .default('other'),
          title: optionalString,
          // Markdownリンク [..](..) や <..> はURL部分に正規化してから検証
          url: z.preprocess(extractUrl, z.string().url('linkのurlがURL形式ではありません')),
          memo: optionalString,
        })
      )
    )
    .optional(),

  consumables: z
    .array(
      z.object({
        name: z.string().min(1, 'consumable.name は必須です'),
        manufacturer: optionalString,
        model_number: optionalString,
        replacement_interval_text: optionalString,
        purchase_url: optionalUrl,
        memo: optionalString,
      })
    )
    .optional(),

  accessories: z
    .array(
      z.object({
        name: z.string().min(1, 'accessory.name は必須です'),
        quantity: z.number().int().nullable().optional(),
        memo: optionalString,
      })
    )
    .optional(),

  maintenance_suggestions: z
    .array(
      z.object({
        maintenance_type: optionalString,
        description: optionalString,
        suggested_interval: optionalString,
        memo: optionalString,
      })
    )
    .optional(),

  notes: z.array(z.string()).optional(),
});

export type AiImportPayload = z.infer<typeof aiImportPayloadSchema>;

export const aiImportApplySchema = z.object({
  payload: aiImportPayloadSchema,
  // 既存値を上書きするか。デフォルトはfalse（空欄のみ反映）
  overwrite: z.boolean().default(false),
  applySpecs: z.boolean().default(true),
  applyLinks: z.boolean().default(true),
  applyConsumables: z.boolean().default(true),
  applyAccessories: z.boolean().default(true),
});

export type AiImportApplyInput = z.infer<typeof aiImportApplySchema>;

// 新規資産を作成しつつ AI 取り込みを一気に反映
export const aiImportCreateAndApplySchema = z.object({
  asset: z.object({
    name: z.string().trim().min(1, '名称を入力してください'),
    assetType: z.enum(ASSET_TYPES).default('device'),
    categoryId: z.string().optional().nullable(),
    locationId: z.string().optional().nullable(),
    status: z.enum(ASSET_STATUSES).default('active'),
    priority: z.enum(ASSET_PRIORITIES).default('medium'),
  }),
  payload: aiImportPayloadSchema,
  applySpecs: z.boolean().default(true),
  applyLinks: z.boolean().default(true),
  applyConsumables: z.boolean().default(true),
  applyAccessories: z.boolean().default(true),
});

export type AiImportCreateAndApplyInput = z.infer<typeof aiImportCreateAndApplySchema>;

// AI 調査用プロンプト生成
export function buildAiResearchPrompt(input: {
  assetName: string;
  assetType?: string | null;
  manufacturer?: string | null;
  modelNumber?: string | null;
  category?: string | null;
}): string {
  const { assetName, assetType, manufacturer, modelNumber, category } = input;
  return `以下の家庭内資産について、製品情報・設備情報・仕様情報を調査し、指定のJSON形式だけで出力してください。
推測で断定せず、不明な項目はnullにしてください。
URLは可能であればメーカー公式ページ、取扱説明書、サポートページを優先してください。
URLはMarkdownリンク記法（[表示文字](URL)）にせず、プレーンなURL文字列（例: https://example.com/page）で記載してください。
links には有効なURLがあるものだけを含め、URLが不明なリンクは出力しないでください（url を null や空文字にしないこと）。

名称: ${assetName}
管理対象種別: ${assetType ?? ''}
メーカー: ${manufacturer ?? ''}
型番: ${modelNumber ?? ''}
カテゴリ: ${category ?? ''}

出力形式:
{
  "asset": {
    "name": "",
    "asset_type": "device|housing_equipment|building_part|furniture|tool|other",
    "manufacturer": "",
    "model_number": "",
    "category_suggestion": "",
    "summary": ""
  },
  "specs": [
    { "spec_name": "", "spec_value": "", "unit": "", "memo": "" }
  ],
  "links": [
    { "link_type": "official|manual|support|purchase|warranty|construction_document|other", "title": "", "url": "", "memo": "" }
  ],
  "consumables": [
    { "name": "", "manufacturer": "", "model_number": "", "replacement_interval_text": "", "purchase_url": "", "memo": "" }
  ],
  "accessories": [
    { "name": "", "quantity": null, "memo": "" }
  ],
  "maintenance_suggestions": [
    { "maintenance_type": "", "description": "", "suggested_interval": "", "memo": "" }
  ],
  "notes": [ "" ]
}

JSON以外の文章は出力しないでください。`;
}
