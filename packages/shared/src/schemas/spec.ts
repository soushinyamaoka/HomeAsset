import { z } from 'zod';
import { optionalString } from './common';

export const specInputSchema = z.object({
  specName: z.string().trim().min(1, '項目名を入力してください'),
  specValue: optionalString,
  unit: optionalString,
  memo: optionalString,
  sortOrder: z
    .union([z.number(), z.string()])
    .transform((v) => (v === '' || v === null || v === undefined ? 0 : Number(v)))
    .refine((v) => !Number.isNaN(v), '数値で入力してください')
    .optional(),
});

export type SpecInput = z.infer<typeof specInputSchema>;
