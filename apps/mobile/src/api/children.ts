// 資産配下の子テーブル群 API
import { api } from './client';
import type {
  SpecInput,
  LinkInput,
  MaintenanceInput,
  RepairInput,
  ConsumableInput,
  AccessoryInput,
  NetworkInfoInput,
} from '@homeasset/shared';
import type {
  AssetSpec,
  AssetLink,
  MaintenanceRecord,
  RepairRecord,
  Consumable,
  Accessory,
  NetworkInfo,
} from './assets';

// ---- specs ----
export async function createSpec(assetId: string, input: SpecInput): Promise<AssetSpec> {
  const res = await api.post(`/api/assets/${assetId}/specs`, input);
  return res.data;
}
export async function updateSpec(specId: string, input: SpecInput): Promise<AssetSpec> {
  const res = await api.put(`/api/asset-specs/${specId}`, input);
  return res.data;
}
export async function deleteSpec(specId: string): Promise<void> {
  await api.delete(`/api/asset-specs/${specId}`);
}

// ---- links ----
export async function createLink(assetId: string, input: LinkInput): Promise<AssetLink> {
  const res = await api.post(`/api/assets/${assetId}/links`, input);
  return res.data;
}
export async function updateLink(linkId: string, input: LinkInput): Promise<AssetLink> {
  const res = await api.put(`/api/asset-links/${linkId}`, input);
  return res.data;
}
export async function deleteLink(linkId: string): Promise<void> {
  await api.delete(`/api/asset-links/${linkId}`);
}

// ---- maintenance ----
export async function createMaintenance(
  assetId: string,
  input: MaintenanceInput
): Promise<MaintenanceRecord> {
  const res = await api.post(`/api/assets/${assetId}/maintenance-records`, input);
  return res.data;
}
export async function updateMaintenance(
  recordId: string,
  input: MaintenanceInput
): Promise<MaintenanceRecord> {
  const res = await api.put(`/api/maintenance-records/${recordId}`, input);
  return res.data;
}
export async function deleteMaintenance(recordId: string): Promise<void> {
  await api.delete(`/api/maintenance-records/${recordId}`);
}

// ---- repairs ----
export async function createRepair(assetId: string, input: RepairInput): Promise<RepairRecord> {
  const res = await api.post(`/api/assets/${assetId}/repair-records`, input);
  return res.data;
}
export async function updateRepair(recordId: string, input: RepairInput): Promise<RepairRecord> {
  const res = await api.put(`/api/repair-records/${recordId}`, input);
  return res.data;
}
export async function deleteRepair(recordId: string): Promise<void> {
  await api.delete(`/api/repair-records/${recordId}`);
}

// ---- consumables ----
export async function createConsumable(
  assetId: string,
  input: ConsumableInput
): Promise<Consumable> {
  const res = await api.post(`/api/assets/${assetId}/consumables`, input);
  return res.data;
}
export async function updateConsumable(
  consumableId: string,
  input: ConsumableInput
): Promise<Consumable> {
  const res = await api.put(`/api/consumables/${consumableId}`, input);
  return res.data;
}
export async function deleteConsumable(consumableId: string): Promise<void> {
  await api.delete(`/api/consumables/${consumableId}`);
}

// ---- accessories ----
export async function createAccessory(
  assetId: string,
  input: AccessoryInput
): Promise<Accessory> {
  const res = await api.post(`/api/assets/${assetId}/accessories`, input);
  return res.data;
}
export async function updateAccessory(
  accessoryId: string,
  input: AccessoryInput
): Promise<Accessory> {
  const res = await api.put(`/api/accessories/${accessoryId}`, input);
  return res.data;
}
export async function deleteAccessory(accessoryId: string): Promise<void> {
  await api.delete(`/api/accessories/${accessoryId}`);
}

// ---- network info ----
export async function upsertNetworkInfo(
  assetId: string,
  input: NetworkInfoInput
): Promise<NetworkInfo> {
  const res = await api.post(`/api/assets/${assetId}/network-info`, input);
  return res.data;
}
export async function deleteNetworkInfo(networkInfoId: string): Promise<void> {
  await api.delete(`/api/network-infos/${networkInfoId}`);
}
