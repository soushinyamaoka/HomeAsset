import { z } from 'zod';

// ===== AI回答(JSON) 用の緩いスキーマ + action_plans 入力への平坦化 =====
const aiInt = z
  .union([z.number(), z.string()])
  .nullable()
  .optional()
  .transform((v) => {
    if (v === null || v === undefined || v === '') return undefined;
    const n = Math.trunc(Number(v));
    return Number.isNaN(n) ? undefined : n;
  });

const aiStr = z
  .union([z.string(), z.number()])
  .nullable()
  .optional()
  .transform((v) => {
    if (v === null || v === undefined) return undefined;
    const s = String(v).trim();
    return s === '' ? undefined : s;
  });

const aiCost = z.object({ min: aiInt, max: aiInt }).partial().nullable().optional();

// AI回答を action_plans の入力（camelCase）に変換するスキーマ。
// コストやトリガーのキー名揺れ（update_cost/replacement_cost 等）も吸収する。
export const actionPlanAiSchema = z
  .object({
    management_policy: aiStr,
    action_phase: aiStr,
    next_action: aiStr,
    professional_consultation_trigger: aiStr,
    professional_trigger: aiStr,
    estimate_timing: aiStr,
    replacement_decision_timing: aiStr,
    replacement_window: z
      .object({ from_year: aiInt, to_year: aiInt, status: aiStr })
      .partial()
      .nullable()
      .optional(),
    costs: z
      .object({
        update_cost: aiCost,
        replacement_cost: aiCost,
        routine_maintenance_cost: aiCost,
        routine_self_maintenance_cost: aiCost,
        professional_service_cost: aiCost,
        professional_service_cost_if_needed: aiCost,
      })
      .partial()
      .nullable()
      .optional(),
    baseline_year: aiInt,
    priority: aiStr,
    notes: z.array(z.string()).nullable().optional(),
    app_import_metadata: z
      .object({ asset_id: aiStr, generated_at: aiStr, schema_version: aiStr })
      .partial()
      .nullable()
      .optional(),
  })
  .passthrough()
  .transform((d) => {
    const c = d.costs;
    const upd = c?.update_cost ?? c?.replacement_cost;
    const rout = c?.routine_maintenance_cost ?? c?.routine_self_maintenance_cost;
    const prof = c?.professional_service_cost ?? c?.professional_service_cost_if_needed;
    return {
      managementPolicy: d.management_policy,
      actionPhase: d.action_phase,
      nextAction: d.next_action,
      professionalTrigger: d.professional_consultation_trigger ?? d.professional_trigger,
      estimateTiming: d.estimate_timing,
      replacementDecisionTiming: d.replacement_decision_timing,
      replacementYearFrom: d.replacement_window?.from_year,
      replacementYearTo: d.replacement_window?.to_year,
      replacementStatus: d.replacement_window?.status,
      replacementCostMin: upd?.min,
      replacementCostMax: upd?.max,
      routineCostMin: rout?.min,
      routineCostMax: rout?.max,
      professionalCostMin: prof?.min,
      professionalCostMax: prof?.max,
      baselineYear: d.baseline_year,
      priority: d.priority,
      notes: d.notes ?? undefined,
      source: 'ai_action_plan' as const,
      schemaVersion: d.app_import_metadata?.schema_version,
      generatedAt: d.app_import_metadata?.generated_at,
      assetIdHint: d.app_import_metadata?.asset_id,
    };
  });

export type ActionPlanAiInput = z.infer<typeof actionPlanAiSchema>;

// ===== プロンプト生成 =====
export interface ActionPlanPromptAsset {
  id: string;
  name: string;
  assetType?: string | null;
  category?: string | null;
  location?: string | null;
  manufacturer?: string | null;
  modelNumber?: string | null;
  purchaseDate?: string | null;
  installedDate?: string | null;
  constructionDate?: string | null;
  priority?: string | null;
  memo?: string | null;
  specs?: { name: string; value?: string | null; unit?: string | null }[];
}

export function buildActionPlanPrompt(asset: ActionPlanPromptAsset): string {
  const assetJson = JSON.stringify(
    {
      asset_id: asset.id,
      name: asset.name,
      asset_type: asset.assetType ?? null,
      category: asset.category ?? null,
      location: asset.location ?? null,
      manufacturer: asset.manufacturer ?? null,
      model_number: asset.modelNumber ?? null,
      purchase_date: asset.purchaseDate ?? null,
      installed_date: asset.installedDate ?? null,
      construction_date: asset.constructionDate ?? null,
      priority: asset.priority ?? null,
      memo: asset.memo ?? null,
      specs: (asset.specs ?? []).map((s) => ({
        name: s.name,
        value: s.value ?? null,
        unit: s.unit ?? null,
      })),
    },
    null,
    2
  );

  return `あなたは、家庭内資産管理アプリ「HomeAsset」の更新計画・メンテナンス計画を作成するアシスタントです。
以下の家庭内資産について、現実的な更新計画・メンテナンス計画を作成してください。

重要方針:
- 「10年で必ず更新」のような機械的な判断はしないでください。標準使用期間や一般的な寿命は、交換期限ではなく「点検・警戒レベルを上げる目安」として扱ってください。
- 直近2年は、原則として高額更新を急がず、セルフ点検・セルフ清掃・症状確認・見積取得を中心にしてください。
- 運用は「まず自前で点検 → 問題がありそうなら業者相談 → 見積取得 → 家計状況と緊急度を見て更新判断」の流れにしてください。
- 「セルフ点検」「セルフ清掃」は持ち主が自前で行う確認・清掃を指し、業者依頼とは区別してください。
- 費用は update_cost(本体交換・買い替え・工事費) / routine_maintenance_cost(セルフ点検・清掃の実費) / professional_service_cost(業者点検・修理・見積取得後に発生しうる費用) の3種に分けてください。
- 不明な項目は推測で断定せず null としてください。一般的な寿命・更新費用・点検周期の目安は現実的な推定として記載して構いません。
- 出力は JSON のみ。説明文・Markdown・コードブロックは付けないでください。

対象資産情報:
${assetJson}

既存の家庭内管理方針:
{
  "base_policy": "低予算・現実運用",
  "near_term_policy": "直近2年は高額更新を原則避け、セルフ点検・症状確認・見積取得を中心にする"
}

出力は次のJSON構造に厳密に合わせてください（キー名・ネストを変えない）:
{
  "management_policy": "この資産をどう管理するか（例: セルフ清掃中心 / 故障時対応 / 定期点検）",
  "action_phase": "セルフ点検・清掃 | 見積候補 | 故障時対応 のいずれか",
  "next_action": "直近で最初にやること（2026/2027/2028以降の要点を1〜3文に集約）",
  "professional_consultation_trigger": "どんな症状が出たら業者に相談すべきか",
  "estimate_timing": "いつ頃・何のために見積だけ取るか（即契約しない前提）",
  "replacement_decision_timing": "本格的に更新判断する条件（故障/安全/修理費/部品供給/家計など）",
  "replacement_window": { "from_year": 2030, "to_year": 2035, "status": "当面はセルフ管理 | 点検・見積候補 | 2年以内に見積候補 など" },
  "costs": {
    "update_cost": { "min": 0, "max": 0, "currency": "JPY" },
    "routine_maintenance_cost": { "min": 0, "max": 0, "currency": "JPY" },
    "professional_service_cost": { "min": 0, "max": 0, "currency": "JPY" }
  },
  "baseline_year": 2024,
  "priority": "high | medium | low",
  "notes": ["年別アクション・リスク・前提・不明点などの補足を1項目ずつ"],
  "app_import_metadata": { "asset_id": "${asset.id}", "generated_at": "YYYY-MM-DDThh:mm:ss+09:00", "schema_version": "1.0" }
}

JSON以外は出力しないでください。`;
}
