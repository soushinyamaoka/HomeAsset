import type { FastifyPluginAsync } from 'fastify';
import { maintenanceInputSchema } from '@homeasset/shared';
import { prisma } from '../lib/prisma';
import { parseBody } from '../utils/validate';
import { parseDateOnly } from '../utils/date';
import { ensureAssetInHousehold } from '../utils/asset-guard';
import { serializeAsset } from '../utils/serialize';

const maintenanceRoutes: FastifyPluginAsync = async (app) => {
  app.get('/assets/:id/maintenance-records', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await ensureAssetInHousehold(id, req.auth.householdId, reply);
    if (!asset) return;
    const records = await prisma.maintenanceRecord.findMany({
      where: { assetId: id },
      orderBy: { maintenanceDate: 'desc' },
    });
    return records.map((r) => serializeAsset(r));
  });

  app.post('/assets/:id/maintenance-records', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await ensureAssetInHousehold(id, req.auth.householdId, reply);
    if (!asset) return;
    const data = parseBody(maintenanceInputSchema, req.body, reply);
    if (!data) return;

    const created = await prisma.maintenanceRecord.create({
      data: {
        householdId: req.auth.householdId,
        assetId: id,
        maintenanceDate: parseDateOnly(data.maintenanceDate)!,
        maintenanceType: data.maintenanceType,
        description: data.description ?? null,
        cost: data.cost ?? null,
        performedBy: data.performedBy ?? null,
        vendorName: data.vendorName ?? null,
        nextDueDate: parseDateOnly(data.nextDueDate),
        photoUrl: data.photoUrl ?? null,
        documentUrl: data.documentUrl ?? null,
        memo: data.memo ?? null,
      },
    });
    return reply.code(201).send(serializeAsset(created));
  });

  app.put('/maintenance-records/:recordId', async (req, reply) => {
    const { recordId } = req.params as { recordId: string };
    const exists = await prisma.maintenanceRecord.findFirst({
      where: { id: recordId, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: 'メンテナンス履歴が見つかりません' });
    const data = parseBody(maintenanceInputSchema, req.body, reply);
    if (!data) return;
    const updated = await prisma.maintenanceRecord.update({
      where: { id: recordId },
      data: {
        maintenanceDate: parseDateOnly(data.maintenanceDate)!,
        maintenanceType: data.maintenanceType,
        description: data.description ?? null,
        cost: data.cost ?? null,
        performedBy: data.performedBy ?? null,
        vendorName: data.vendorName ?? null,
        nextDueDate: parseDateOnly(data.nextDueDate),
        photoUrl: data.photoUrl ?? null,
        documentUrl: data.documentUrl ?? null,
        memo: data.memo ?? null,
      },
    });
    return serializeAsset(updated);
  });

  app.delete('/maintenance-records/:recordId', async (req, reply) => {
    const { recordId } = req.params as { recordId: string };
    const exists = await prisma.maintenanceRecord.findFirst({
      where: { id: recordId, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: 'メンテナンス履歴が見つかりません' });
    await prisma.maintenanceRecord.delete({ where: { id: recordId } });
    return reply.code(204).send();
  });
};

export default maintenanceRoutes;
