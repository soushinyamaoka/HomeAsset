import { z } from 'zod';
import { CONNECTION_TYPES } from '../constants';
import { optionalString, optionalUrl } from './common';

export const networkInfoInputSchema = z.object({
  ipAddress: optionalString,
  hostName: optionalString,
  macAddress: optionalString,
  adminUrl: optionalUrl,
  port: z
    .union([z.number(), z.string()])
    .transform((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || (!Number.isNaN(v) && v >= 0 && v <= 65535), 'ポート番号は0〜65535の数値で入力してください')
    .optional(),
  connectionType: z.enum(CONNECTION_TYPES).optional(),
  credentialStorageMemo: optionalString,
  settingsMemo: optionalString,
});

export type NetworkInfoInput = z.infer<typeof networkInfoInputSchema>;
