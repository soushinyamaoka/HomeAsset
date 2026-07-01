import type { FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';

// assetIdが現在のhouseholdのものか確認。違えば404を返してnull
export async function ensureAssetInHousehold(
  assetId: string,
  householdId: string,
  reply: FastifyReply
) {
  const asset = await prisma.homeAsset.findFirst({
    where: { id: assetId, householdId },
    select: { id: true, householdId: true },
  });
  if (!asset) {
    reply.code(404).send({ message: '資産が見つかりません' });
    return null;
  }
  return asset;
}
