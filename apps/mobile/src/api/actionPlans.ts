import { api } from './client';
import type { ActionPlanInput } from '@homeasset/shared';
import type { ActionPlan } from './assets';

// 世帯の全アクション計画（資産名つき・更新時期が近い順）
export async function fetchActionPlans(): Promise<ActionPlan[]> {
  const res = await api.get('/api/action-plans');
  return res.data;
}

export async function fetchActionPlan(assetId: string): Promise<ActionPlan | null> {
  const res = await api.get(`/api/assets/${assetId}/action-plan`);
  return res.data;
}

export async function upsertActionPlan(
  assetId: string,
  input: ActionPlanInput
): Promise<ActionPlan> {
  const res = await api.put(`/api/assets/${assetId}/action-plan`, input);
  return res.data;
}

export async function deleteActionPlan(assetId: string): Promise<void> {
  await api.delete(`/api/assets/${assetId}/action-plan`);
}
