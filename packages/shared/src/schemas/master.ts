import { z } from 'zod';
import { ASSET_TYPES } from '../constants';
import { optionalString } from './common';

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'カテゴリ名を入力してください'),
  assetType: z.enum(ASSET_TYPES).optional(),
  icon: optionalString,
  sortOrder: z
    .union([z.number(), z.string()])
    .transform((v) => (v === '' || v === null || v === undefined ? 0 : Number(v)))
    .refine((v) => !Number.isNaN(v), '数値で入力してください')
    .optional(),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const locationInputSchema = z.object({
  name: z.string().trim().min(1, '設置場所名を入力してください'),
  parentId: z.string().optional().nullable(),
  memo: optionalString,
  sortOrder: z
    .union([z.number(), z.string()])
    .transform((v) => (v === '' || v === null || v === undefined ? 0 : Number(v)))
    .refine((v) => !Number.isNaN(v), '数値で入力してください')
    .optional(),
});

export type LocationInput = z.infer<typeof locationInputSchema>;
