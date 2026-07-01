import type { QueryClient } from '@tanstack/react-query';

// 資産に関連するクエリの無効化を一括で行う共通ヘルパー。
// 子テーブル（specs/links/maintenance/repairs/consumables/accessories/network）や
// 資産本体の保存・削除後はこれを呼べば、一覧・詳細・ダッシュボードが揃って最新化される。
export function invalidateAssetRelated(qc: QueryClient, assetId?: string) {
  if (assetId) {
    qc.invalidateQueries({ queryKey: ['asset', assetId] });
  }
  qc.invalidateQueries({ queryKey: ['assets'] });
  qc.invalidateQueries({ queryKey: ['dashboard'] });
}

// メンテ計画（action_plans）を含めて無効化
export function invalidateAssetPlans(qc: QueryClient, assetId?: string) {
  invalidateAssetRelated(qc, assetId);
  qc.invalidateQueries({ queryKey: ['action-plans'] });
}
