import { api } from './client';
import type { AssetInput, AssetListQuery } from '@homeasset/shared';

export interface AssetCategory {
  id: string;
  name: string;
  icon: string | null;
  assetType: string | null;
}
export interface AssetLocation {
  id: string;
  name: string;
}

export interface AssetSummary {
  id: string;
  name: string;
  assetType: string;
  manufacturer: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  status: string;
  priority: string;
  categoryId: string | null;
  locationId: string | null;
  category?: AssetCategory | null;
  location?: AssetLocation | null;
  warrantyEndDate: string | null;
  purchaseDate: string | null;
  installedDate: string | null;
  constructionDate: string | null;
  updatedAt: string;
}

export interface AssetDetail extends AssetSummary {
  manualUrl: string | null;
  supportUrl: string | null;
  officialUrl: string | null;
  purchaseStore: string | null;
  purchasePrice: number | null;
  purchaseUrl: string | null;
  orderNumber: string | null;
  contractNumber: string | null;
  receiptUrl: string | null;
  constructionDocumentUrl: string | null;
  contractorName: string | null;
  contractorContact: string | null;
  contactPerson: string | null;
  constructionCost: number | null;
  warrantyStartDate: string | null;
  hasExtendedWarranty: boolean;
  warrantyMemo: string | null;
  photoUrl: string | null;
  labelPhotoUrl: string | null;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  expectedLifespanYears: number | null;
  replacementDueDate: string | null;
  memo: string | null;
  specs: AssetSpec[];
  links: AssetLink[];
  maintenanceRecords: MaintenanceRecord[];
  repairRecords: RepairRecord[];
  consumables: Consumable[];
  accessories: Accessory[];
  networkInfo: NetworkInfo | null;
  actionPlan: ActionPlan | null;
}

export interface AssetSpec {
  id: string;
  assetId: string;
  specName: string;
  specValue: string | null;
  unit: string | null;
  memo: string | null;
  sortOrder: number;
}

export interface AssetLink {
  id: string;
  assetId: string;
  linkType: string;
  title: string | null;
  url: string;
  memo: string | null;
}

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  maintenanceDate: string;
  maintenanceType: string;
  description: string | null;
  cost: number | null;
  performedBy: string | null;
  vendorName: string | null;
  nextDueDate: string | null;
  photoUrl: string | null;
  documentUrl: string | null;
  memo: string | null;
}

export interface RepairRecord {
  id: string;
  assetId: string;
  occurredDate: string;
  symptom: string | null;
  cause: string | null;
  actionTaken: string | null;
  vendorName: string | null;
  ticketNumber: string | null;
  estimatedCost: number | null;
  cost: number | null;
  usedWarranty: boolean;
  completedDate: string | null;
  status: string;
  photoUrl: string | null;
  estimateUrl: string | null;
  invoiceUrl: string | null;
  memo: string | null;
}

export interface Consumable {
  id: string;
  assetId: string;
  name: string;
  manufacturer: string | null;
  modelNumber: string | null;
  replacementIntervalText: string | null;
  lastReplacedDate: string | null;
  nextReplacementDate: string | null;
  purchaseUrl: string | null;
  memo: string | null;
}

export interface Accessory {
  id: string;
  assetId: string;
  name: string;
  quantity: number | null;
  storageLocation: string | null;
  memo: string | null;
}

export interface NetworkInfo {
  id: string;
  assetId: string;
  ipAddress: string | null;
  hostName: string | null;
  macAddress: string | null;
  adminUrl: string | null;
  port: number | null;
  connectionType: string | null;
  credentialStorageMemo: string | null;
  settingsMemo: string | null;
}

export interface ActionPlan {
  id: string;
  assetId: string;
  managementPolicy: string | null;
  actionPhase: string | null;
  nextAction: string | null;
  professionalTrigger: string | null;
  estimateTiming: string | null;
  replacementDecisionTiming: string | null;
  replacementYearFrom: number | null;
  replacementYearTo: number | null;
  replacementStatus: string | null;
  replacementCostMin: number | null;
  replacementCostMax: number | null;
  routineCostMin: number | null;
  routineCostMax: number | null;
  professionalCostMin: number | null;
  professionalCostMax: number | null;
  baselineYear: number | null;
  priority: string | null;
  notes: string[];
  source: string | null;
  schemaVersion: string | null;
  generatedAt: string | null;
  // /api/action-plans 一覧時のみ同梱
  asset?: { id: string; name: string; assetType: string } | null;
}

export async function fetchAssets(query: Partial<AssetListQuery> = {}): Promise<AssetSummary[]> {
  const res = await api.get('/api/assets', { params: query });
  return res.data;
}

export async function fetchAsset(id: string): Promise<AssetDetail> {
  const res = await api.get(`/api/assets/${id}`);
  return res.data;
}

export async function createAsset(input: AssetInput): Promise<AssetDetail> {
  const res = await api.post('/api/assets', input);
  return res.data;
}

export async function updateAsset(id: string, input: AssetInput): Promise<AssetDetail> {
  const res = await api.put(`/api/assets/${id}`, input);
  return res.data;
}

export async function deleteAsset(id: string): Promise<void> {
  await api.delete(`/api/assets/${id}`);
}

export async function disposeAsset(id: string): Promise<AssetDetail> {
  // 空ボディだとContent-Typeが付かずFastifyで415になるため明示的に{}を送る
  const res = await api.post(`/api/assets/${id}/dispose`, {});
  return res.data;
}

export async function replaceAsset(id: string): Promise<AssetDetail> {
  const res = await api.post(`/api/assets/${id}/replace`, {});
  return res.data;
}
