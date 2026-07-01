import type { FastifyPluginAsync } from 'fastify';
import { locationInputSchema } from '@homeasset/shared';
import { prisma } from '../lib/prisma';
import { parseBody } from '../utils/validate';

const locationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (req) => {
    return prisma.location.findMany({
      where: { householdId: req.auth.householdId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  });

  app.post('/', async (req, reply) => {
    const data = parseBody(locationInputSchema, req.body, reply);
    if (!data) return;
    const created = await prisma.location.create({
      data: {
        householdId: req.auth.householdId,
        name: data.name,
        parentId: data.parentId ?? null,
        memo: data.memo ?? null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    return reply.code(201).send(created);
  });

  app.put('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const exists = await prisma.location.findFirst({
      where: { id, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: '設置場所が見つかりません' });
    const data = parseBody(locationInputSchema, req.body, reply);
    if (!data) return;
    return prisma.location.update({
      where: { id },
      data: {
        name: data.name,
        parentId: data.parentId ?? null,
        memo: data.memo ?? null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  });

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const exists = await prisma.location.findFirst({
      where: { id, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: '設置場所が見つかりません' });
    // 参照解除と削除を同一トランザクションで行う（途中失敗時の不整合防止）
    await prisma.$transaction([
      prisma.homeAsset.updateMany({
        where: { locationId: id, householdId: req.auth.householdId },
        data: { locationId: null },
      }),
      prisma.location.delete({ where: { id } }),
    ]);
    return reply.code(204).send();
  });
};

export default locationRoutes;
