import { z } from 'zod';
import { REPAIR_STATUSES } from '../constants';
import { optionalDate, optionalNonNegativeNumber, optionalString, optionalUrl } from './common';

export const repairInputSchema = z
  .object({
    occurredDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '発生日はYYYY-MM-DD形式で入力してください'),
    symptom: optionalString,
    cause: optionalString,
    actionTaken: optionalString,
    vendorName: optionalString,
    ticketNumber: optionalString,
    estimatedCost: optionalNonNegativeNumber,
    cost: optionalNonNegativeNumber,
    usedWarranty: z.boolean().optional(),
    completedDate: optionalDate,
    status: z.enum(REPAIR_STATUSES).default('pending'),
    photoUrl: optionalUrl,
    estimateUrl: optionalUrl,
    invoiceUrl: optionalUrl,
    memo: optionalString,
  })
  .superRefine((val, ctx) => {
    if (val.completedDate && val.completedDate < val.occurredDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['completedDate'],
        message: '完了日は発生日以降にしてください',
      });
    }
  });

export type RepairInput = z.infer<typeof repairInputSchema>;
