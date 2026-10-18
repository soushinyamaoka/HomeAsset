import { z } from 'zod';

export const aiExportQuerySchema = z.object({
  includeNetwork: z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === 'true')
    .default(false),
});

type JsonRecord = Record<string, unknown>;

export interface AiExport {
  format: 'homeasset-ai-export';
  formatVersion: 1;
  exportedAt: string;
  householdName?: string;
  guide: JsonRecord;
  summary: { assetCount: number; byStatus: Record<string, number>; byAssetType: Record<string, number> };
  assets: JsonRecord[];
}
