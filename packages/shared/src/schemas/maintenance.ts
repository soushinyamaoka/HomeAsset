import { z } from 'zod';
import { MAINTENANCE_TYPES } from '../constants';
import { optionalDate, optionalNonNegativeNumber, optionalString, optionalUrl } from './common';

export const maintenanceInputSchema = z
  .object({
    maintenanceDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '実施日はYYYY-MM-DD形式で入力してください'),
    maintenanceType: z.enum(MAINTENANCE_TYPES).default('inspection'),
    description: optionalString,
    cost: optionalNonNegativeNumber,
    performedBy: optionalString,
    vendorName: optionalString,
    nextDueDate: optionalDate,
    photoUrl: optionalUrl,
    documentUrl: optionalUrl,
    memo: optionalString,
  })
  .superRefine((val, ctx) => {
    if (val.nextDueDate && val.maintenanceDate && val.nextDueDate < val.maintenanceDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nextDueDate'],
        message: '次回予定日は実施日以降にしてください',
      });
    }
  });

export type MaintenanceInput = z.infer<typeof maintenanceInputSchema>;
