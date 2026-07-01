import { z } from 'zod';
import { LINK_TYPES } from '../constants';
import { optionalString } from './common';

export const linkInputSchema = z.object({
  linkType: z.enum(LINK_TYPES).default('manual'),
  title: optionalString,
  url: z.string().trim().url('URL形式で入力してください'),
  memo: optionalString,
});

export type LinkInput = z.infer<typeof linkInputSchema>;
