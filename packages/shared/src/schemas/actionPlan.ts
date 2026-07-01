import { z } from 'zod';
import { optionalString } from './common';

// 任意の整数（空文字 / null / undefined は undefined に）
const optionalInt = z
  .union([z.number(), z.string()])
  .transform((v) => (v === '' || v === null || v === undefined ? undefined : Math.trunc(Number(v))))
  .refine((v) => v === undefined || !Number.isNaN(v), '数値を入力してください')
  .optional();

// 資産ごとのメンテ・更新アクション計画（1資産1件 / upsert）
export const actionPlanInputSchema = z.object({
  managementPolicy: optionalString, // 方針
  actionPhase: optionalString, // 段階
  nextAction: optionalString, // 次にやること
  professionalTrigger: optionalString, // 業者相談トリガー
  estimateTiming: optionalString, // 見積タイミング
  replacementDecisionTiming: optionalString, // 更新判断の条件

  replacementYearFrom: optionalInt, // 更新予定 年(From)
  replacementYearTo: optionalInt, // 更新予定 年(To)
  replacementStatus: optionalString,

  replacementCostMin: optionalInt, // 概算更新費(円)
  replacementCostMax: optionalInt,
  routineCostMin: optionalInt, // 通常メンテ費(円)
  routineCostMax: optionalInt,
  professionalCostMin: optionalInt, // 業者費(円)
  professionalCostMax: optionalInt,

  baselineYear: optionalInt,
  priority: optionalString, // high | medium | low
  notes: z.array(z.string()).optional(),

  source: optionalString,
  schemaVersion: optionalString,
  generatedAt: optionalString, // ISO文字列。route側で Date 化
});

export type ActionPlanInput = z.infer<typeof actionPlanInputSchema>;
