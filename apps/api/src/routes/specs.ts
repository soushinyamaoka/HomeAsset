import type { FastifyPluginAsync } from 'fastify';
import { specInputSchema } from '@homeasset/shared';
import { prisma } from '../lib/prisma';
import { parseBody } from '../utils/validate';
import { ensureAssetInHousehold } from '../utils/asset-guard';

const specRoutes: FastifyPluginAsync = async (app) => {
  app.get('/assets/:id/specs', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await ensureAssetInHousehold(id, req.auth.householdId, reply);
    if (!asset) return;
    return prisma.assetSpec.findMany({
      where: { assetId: id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  });

  app.post('/assets/:id/specs', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await ensureAssetInHousehold(id, req.auth.householdId, reply);
    if (!asset) return;
    const data = parseBody(specInputSchema, req.body, reply);
    if (!data) return;
    const created = await prisma.assetSpec.create({
      data: {
        householdId: req.auth.householdId,
        assetId: id,
        specName: data.specName,
        specValue: data.specValue ?? null,
        unit: data.unit ?? null,
        memo: data.memo ?? null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    return reply.code(201).send(created);
  });

  app.put('/asset-specs/:specId', async (req, reply) => {
    const { specId } = req.params as { specId: string };
    const exists = await prisma.assetSpec.findFirst({
      where: { id: specId, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: 'スペック情報が見つかりません' });
    const data = parseBody(specInputSchema, req.body, reply);
    if (!data) return;
    return prisma.assetSpec.update({
      where: { id: specId },
      data: {
        specName: data.specName,
        specValue: data.specValue ?? null,
        unit: data.unit ?? null,
        memo: data.memo ?? null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  });

  app.delete('/asset-specs/:specId', async (req, reply) => {
    const { specId } = req.params as { specId: string };
    const exists = await prisma.assetSpec.findFirst({
      where: { id: specId, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: 'スペック情報が見つかりません' });
    await prisma.assetSpec.delete({ where: { id: specId } });
    return reply.code(204).send();
  });
};

export default specRoutes;
