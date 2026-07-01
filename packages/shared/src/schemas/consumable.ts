import { z } from 'zod';
import { optionalDate, optionalString, optionalUrl } from './common';

export const consumableInputSchema = z.object({
  name: z.string().trim().min(1, '消耗品名を入力してください'),
  manufacturer: optionalString,
  modelNumber: optionalString,
  replacementIntervalText: optionalString,
  lastReplacedDate: optionalDate,
  nextReplacementDate: optionalDate,
  purchaseUrl: optionalUrl,
  memo: optionalString,
});

export type ConsumableInput = z.infer<typeof consumableInputSchema>;
