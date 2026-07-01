import type { FastifyPluginAsync } from 'fastify';
import { linkInputSchema } from '@homeasset/shared';
import { prisma } from '../lib/prisma';
import { parseBody } from '../utils/validate';
import { ensureAssetInHousehold } from '../utils/asset-guard';

const linkRoutes: FastifyPluginAsync = async (app) => {
  app.get('/assets/:id/links', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await ensureAssetInHousehold(id, req.auth.householdId, reply);
    if (!asset) return;
    return prisma.assetLink.findMany({
      where: { assetId: id },
      orderBy: { createdAt: 'asc' },
    });
  });

  app.post('/assets/:id/links', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await ensureAssetInHousehold(id, req.auth.householdId, reply);
    if (!asset) return;
    const data = parseBody(linkInputSchema, req.body, reply);
    if (!data) return;
    const created = await prisma.assetLink.create({
      data: {
        householdId: req.auth.householdId,
        assetId: id,
        linkType: data.linkType,
        title: data.title ?? null,
        url: data.url,
        memo: data.memo ?? null,
      },
    });
    return reply.code(201).send(created);
  });

  app.put('/asset-links/:linkId', async (req, reply) => {
    const { linkId } = req.params as { linkId: string };
    const exists = await prisma.assetLink.findFirst({
      where: { id: linkId, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: 'リンクが見つかりません' });
    const data = parseBody(linkInputSchema, req.body, reply);
    if (!data) return;
    return prisma.assetLink.update({
      where: { id: linkId },
      data: {
        linkType: data.linkType,
        title: data.title ?? null,
        url: data.url,
        memo: data.memo ?? null,
      },
    });
  });

  app.delete('/asset-links/:linkId', async (req, reply) => {
    const { linkId } = req.params as { linkId: string };
    const exists = await prisma.assetLink.findFirst({
      where: { id: linkId, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: 'リンクが見つかりません' });
    await prisma.assetLink.delete({ where: { id: linkId } });
    return reply.code(204).send();
  });
};

export default linkRoutes;
