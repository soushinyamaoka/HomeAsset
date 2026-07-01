import type { FastifyPluginAsync } from 'fastify';
import { repairInputSchema, type RepairStatus, type AssetStatus } from '@homeasset/shared';
import { prisma } from '../lib/prisma';
import { parseBody } from '../utils/validate';
import { parseDateOnly } from '../utils/date';
import { ensureAssetInHousehold } from '../utils/asset-guard';
import { serializeAsset } from '../utils/serialize';

// 修理ステータスを資産ステータスに反映
function assetStatusFromRepair(status: RepairStatus): AssetStatus | null {
  switch (status) {
    case 'pending':
      return 'broken';
    case 'in_progress':
      return 'repairing';
    case 'completed':
      return 'active';
    case 'replaced':
      return 'replaced';
    case 'rebought':
    case 'disposed':
      return 'disposed';
    default:
      return null;
  }
}

const repairRoutes: FastifyPluginAsync = async (app) => {
  app.get('/assets/:id/repair-records', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await ensureAssetInHousehold(id, req.auth.householdId, reply);
    if (!asset) return;
    const records = await prisma.repairRecord.findMany({
      where: { assetId: id },
      orderBy: { occurredDate: 'desc' },
    });
    return records.map((r) => serializeAsset(r));
  });

  app.post('/assets/:id/repair-records', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await ensureAssetInHousehold(id, req.auth.householdId, reply);
    if (!asset) return;
    const data = parseBody(repairInputSchema, req.body, reply);
    if (!data) return;
    const created = await prisma.repairRecord.create({
      data: {
        householdId: req.auth.householdId,
        assetId: id,
        occurredDate: parseDateOnly(data.occurredDate)!,
        symptom: data.symptom ?? null,
        cause: data.cause ?? null,
        actionTaken: data.actionTaken ?? null,
        vendorName: data.vendorName ?? null,
        ticketNumber: data.ticketNumber ?? null,
        estimatedCost: data.estimatedCost ?? null,
        cost: data.cost ?? null,
        usedWarranty: data.usedWarranty ?? false,
        completedDate: parseDateOnly(data.completedDate),
        status: data.status,
        photoUrl: data.photoUrl ?? null,
        estimateUrl: data.estimateUrl ?? null,
        invoiceUrl: data.invoiceUrl ?? null,
        memo: data.memo ?? null,
      },
    });

    const nextStatus = assetStatusFromRepair(data.status);
    if (nextStatus) {
      await prisma.homeAsset.update({ where: { id }, data: { status: nextStatus } });
    }

    return reply.code(201).send(serializeAsset(created));
  });

  app.put('/repair-records/:recordId', async (req, reply) => {
    const { recordId } = req.params as { recordId: string };
    const exists = await prisma.repairRecord.findFirst({
      where: { id: recordId, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: '修理履歴が見つかりません' });
    const data = parseBody(repairInputSchema, req.body, reply);
    if (!data) return;
    const updated = await prisma.repairRecord.update({
      where: { id: recordId },
      data: {
        occurredDate: parseDateOnly(data.occurredDate)!,
        symptom: data.symptom ?? null,
        cause: data.cause ?? null,
        actionTaken: data.actionTaken ?? null,
        vendorName: data.vendorName ?? null,
        ticketNumber: data.ticketNumber ?? null,
        estimatedCost: data.estimatedCost ?? null,
        cost: data.cost ?? null,
        usedWarranty: data.usedWarranty ?? false,
        completedDate: parseDateOnly(data.completedDate),
        status: data.status,
        photoUrl: data.photoUrl ?? null,
        estimateUrl: data.estimateUrl ?? null,
        invoiceUrl: data.invoiceUrl ?? null,
        memo: data.memo ?? null,
      },
    });

    const nextStatus = assetStatusFromRepair(data.status);
    if (nextStatus) {
      await prisma.homeAsset.update({
        where: { id: exists.assetId },
        data: { status: nextStatus },
      });
    }

    return serializeAsset(updated);
  });

  app.delete('/repair-records/:recordId', async (req, reply) => {
    const { recordId } = req.params as { recordId: string };
    const exists = await prisma.repairRecord.findFirst({
      where: { id: recordId, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: '修理履歴が見つかりません' });
    await prisma.repairRecord.delete({ where: { id: recordId } });
    return reply.code(204).send();
  });
};

export default repairRoutes;
