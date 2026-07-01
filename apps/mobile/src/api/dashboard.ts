import { api } from './client';

export interface DashboardAssetSummary {
  id: string;
  name: string;
  assetType: string;
  manufacturer: string | null;
  modelNumber: string | null;
  status: string;
  categoryName: string | null;
  locationName: string | null;
  warrantyEndDate: string | null;
  nextMaintenanceDate: string | null;
}

export interface DashboardSummary {
  assetCount: number;
  warrantyExpiringSoonAssets: DashboardAssetSummary[];
  warrantyExpiredAssets: DashboardAssetSummary[];
  upcomingMaintenanceAssets: DashboardAssetSummary[];
  brokenAssets: DashboardAssetSummary[];
  replacementPlannedAssets: DashboardAssetSummary[];
  recentAssets: DashboardAssetSummary[];
  incompleteAssets: DashboardAssetSummary[];
}

export async function fetchDashboard(): Promise<DashboardSummary> {
  const res = await api.get('/api/dashboard');
  return res.data;
}
