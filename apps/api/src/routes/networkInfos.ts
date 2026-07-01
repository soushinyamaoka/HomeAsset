import type { FastifyPluginAsync } from 'fastify';
import { networkInfoInputSchema } from '@homeasset/shared';
import { prisma } from '../lib/prisma';
import { parseBody } from '../utils/validate';
import { ensureAssetInHousehold } from '../utils/asset-guard';

const networkRoutes: FastifyPluginAsync = async (app) => {
  app.get('/assets/:id/network-info', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await ensureAssetInHousehold(id, req.auth.householdId, reply);
    if (!asset) return;
    const info = await prisma.networkInfo.findUnique({ where: { assetId: id } });
    return info ?? null;
  });

  // POST で upsert
  app.post('/assets/:id/network-info', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await ensureAssetInHousehold(id, req.auth.householdId, reply);
    if (!asset) return;
    const data = parseBody(networkInfoInputSchema, req.body, reply);
    if (!data) return;
    const upserted = await prisma.networkInfo.upsert({
      where: { assetId: id },
      update: {
        ipAddress: data.ipAddress ?? null,
        hostName: data.hostName ?? null,
        macAddress: data.macAddress ?? null,
        adminUrl: data.adminUrl ?? null,
        port: data.port ?? null,
        connectionType: data.connectionType ?? null,
        credentialStorageMemo: data.credentialStorageMemo ?? null,
        settingsMemo: data.settingsMemo ?? null,
      },
      create: {
        householdId: req.auth.householdId,
        assetId: id,
        ipAddress: data.ipAddress ?? null,
        hostName: data.hostName ?? null,
        macAddress: data.macAddress ?? null,
        adminUrl: data.adminUrl ?? null,
        port: data.port ?? null,
        connectionType: data.connectionType ?? null,
        credentialStorageMemo: data.credentialStorageMemo ?? null,
        settingsMemo: data.settingsMemo ?? null,
      },
    });
    return reply.code(201).send(upserted);
  });

  app.put('/network-infos/:networkInfoId', async (req, reply) => {
    const { networkInfoId } = req.params as { networkInfoId: string };
    const exists = await prisma.networkInfo.findFirst({
      where: { id: networkInfoId, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: 'ネットワーク情報が見つかりません' });
    const data = parseBody(networkInfoInputSchema, req.body, reply);
    if (!data) return;
    return prisma.networkInfo.update({
      where: { id: networkInfoId },
      data: {
        ipAddress: data.ipAddress ?? null,
        hostName: data.hostName ?? null,
        macAddress: data.macAddress ?? null,
        adminUrl: data.adminUrl ?? null,
        port: data.port ?? null,
        connectionType: data.connectionType ?? null,
        credentialStorageMemo: data.credentialStorageMemo ?? null,
        settingsMemo: data.settingsMemo ?? null,
      },
    });
  });

  app.delete('/network-infos/:networkInfoId', async (req, reply) => {
    const { networkInfoId } = req.params as { networkInfoId: string };
    const exists = await prisma.networkInfo.findFirst({
      where: { id: networkInfoId, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: 'ネットワーク情報が見つかりません' });
    await prisma.networkInfo.delete({ where: { id: networkInfoId } });
    return reply.code(204).send();
  });
};

export default networkRoutes;
