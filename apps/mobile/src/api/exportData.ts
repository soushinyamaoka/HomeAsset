import type { AiExport } from '@homeasset/shared';
import { api } from './client';

export async function fetchAiExport(includeNetwork: boolean): Promise<AiExport> {
  const response = await api.get<AiExport>('/api/export/ai', { params: { includeNetwork } });
  return response.data;
}
