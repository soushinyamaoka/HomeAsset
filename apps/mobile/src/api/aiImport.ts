import { api } from './client';
import type { AiImportPayload } from '@homeasset/shared';
import type { AssetDetail } from './assets';

export interface AiImportParseResult {
  payload: AiImportPayload;
  existingAsset: any | null;
}

export async function parseAiImport(
  rawJson: string,
  assetId?: string
): Promise<AiImportParseResult> {
  const res = await api.post('/api/ai-import/parse', { rawJson, assetId });
  return res.data;
}

export interface AiImportApplyResult {
  ok: boolean;
  counts: {
    assetFieldsUpdated: number;
    specsCreated: number;
    linksCreated: number;
    consumablesCreated: number;
    accessoriesCreated: number;
  };
}

export async function applyAiImport(
  assetId: string,
  payload: AiImportPayload,
  options: {
    overwrite?: boolean;
    applySpecs?: boolean;
    applyLinks?: boolean;
    applyConsumables?: boolean;
    applyAccessories?: boolean;
  } = {}
): Promise<AiImportApplyResult> {
  const res = await api.post(`/api/assets/${assetId}/ai-import/apply`, {
    payload,
    overwrite: options.overwrite ?? false,
    applySpecs: options.applySpecs ?? true,
    applyLinks: options.applyLinks ?? true,
    applyConsumables: options.applyConsumables ?? true,
    applyAccessories: options.applyAccessories ?? true,
  });
  return res.data;
}

export interface AiImportCreateAndApplyResult {
  asset: AssetDetail;
  counts: {
    specsCreated: number;
    linksCreated: number;
    consumablesCreated: number;
    accessoriesCreated: number;
  };
}

export async function createAndApplyAiImport(
  asset: {
    name: string;
    assetType?: string;
    categoryId?: string | null;
    locationId?: string | null;
    status?: string;
    priority?: string;
  },
  payload: AiImportPayload,
  options: {
    applySpecs?: boolean;
    applyLinks?: boolean;
    applyConsumables?: boolean;
    applyAccessories?: boolean;
  } = {}
): Promise<AiImportCreateAndApplyResult> {
  const res = await api.post('/api/ai-import/create-and-apply', {
    asset,
    payload,
    applySpecs: options.applySpecs ?? true,
    applyLinks: options.applyLinks ?? true,
    applyConsumables: options.applyConsumables ?? true,
    applyAccessories: options.applyAccessories ?? true,
  });
  return res.data;
}
