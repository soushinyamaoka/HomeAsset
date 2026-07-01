import type { FastifyPluginAsync } from 'fastify';
import { consumableInputSchema } from '@homeasset/shared';
import { prisma } from '../lib/prisma';
import { parseBody } from '../utils/validate';
import { parseDateOnly } from '../utils/date';
import { ensureAssetInHousehold } from '../utils/asset-guard';
import { serializeAsset } from '../utils/serialize';

const consumableRoutes: FastifyPluginAsync = async (app) => {
  app.get('/assets/:id/consumables', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await ensureAssetInHousehold(id, req.auth.householdId, reply);
    if (!asset) return;
    const items = await prisma.consumable.findMany({
      where: { assetId: id },
      orderBy: { createdAt: 'asc' },
    });
    return items.map((r) => serializeAsset(r));
  });

  app.post('/assets/:id/consumables', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await ensureAssetInHousehold(id, req.auth.householdId, reply);
    if (!asset) return;
    const data = parseBody(consumableInputSchema, req.body, reply);
    if (!data) return;
    const created = await prisma.consumable.create({
      data: {
        householdId: req.auth.householdId,
        assetId: id,
        name: data.name,
        manufacturer: data.manufacturer ?? null,
        modelNumber: data.modelNumber ?? null,
        replacementIntervalText: data.replacementIntervalText ?? null,
        lastReplacedDate: parseDateOnly(data.lastReplacedDate),
        nextReplacementDate: parseDateOnly(data.nextReplacementDate),
        purchaseUrl: data.purchaseUrl ?? null,
        memo: data.memo ?? null,
      },
    });
    return reply.code(201).send(serializeAsset(created));
  });

  app.put('/consumables/:consumableId', async (req, reply) => {
    const { consumableId } = req.params as { consumableId: string };
    const exists = await prisma.consumable.findFirst({
      where: { id: consumableId, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: '消耗品が見つかりません' });
    const data = parseBody(consumableInputSchema, req.body, reply);
    if (!data) return;
    const updated = await prisma.consumable.update({
      where: { id: consumableId },
      data: {
        name: data.name,
        manufacturer: data.manufacturer ?? null,
        modelNumber: data.modelNumber ?? null,
        replacementIntervalText: data.replacementIntervalText ?? null,
        lastReplacedDate: parseDateOnly(data.lastReplacedDate),
        nextReplacementDate: parseDateOnly(data.nextReplacementDate),
        purchaseUrl: data.purchaseUrl ?? null,
        memo: data.memo ?? null,
      },
    });
    return serializeAsset(updated);
  });

  app.delete('/consumables/:consumableId', async (req, reply) => {
    const { consumableId } = req.params as { consumableId: string };
    const exists = await prisma.consumable.findFirst({
      where: { id: consumableId, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: '消耗品が見つかりません' });
    await prisma.consumable.delete({ where: { id: consumableId } });
    return reply.code(204).send();
  });
};

export default consumableRoutes;
