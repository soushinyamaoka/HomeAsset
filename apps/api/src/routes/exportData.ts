import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { serializeAsset } from '../utils/serialize';
import { aiExportQuerySchema } from '@homeasset/shared';
import { buildAiExport } from '../utils/aiExport';

const exportRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ai', async (req, reply) => {
    const parsed = aiExportQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ message: '検索条件が不正です' });
    const householdId = req.auth.householdId;
    const [household, assets] = await Promise.all([
      prisma.household.findUnique({ where: { id: householdId }, select: { name: true } }),
      prisma.homeAsset.findMany({
        where: { householdId },
        include: {
          category: true,
          location: { include: { parent: true } },
          specs: { orderBy: { sortOrder: 'asc' } },
          links: true,
          maintenanceRecords: { orderBy: { maintenanceDate: 'desc' } },
          repairRecords: { orderBy: { occurredDate: 'desc' } },
          consumables: true,
          accessories: true,
          networkInfo: true,
          actionPlan: true,
        },
      }),
    ]);
    return buildAiExport({ householdName: household?.name, assets: assets.map((asset) => serializeAsset(asset)) }, parsed.data);
  });

  app.get('/json', async (req, reply) => {
    const householdId = req.auth.householdId;

    const [household, categories, locations, assets] = await Promise.all([
      prisma.household.findUnique({ where: { id: householdId } }),
      prisma.category.findMany({ where: { householdId }, orderBy: { sortOrder: 'asc' } }),
      prisma.location.findMany({ where: { householdId }, orderBy: { sortOrder: 'asc' } }),
      prisma.homeAsset.findMany({
        where: { householdId },
        include: {
          category: true,
          location: true,
          specs: true,
          links: true,
          maintenanceRecords: true,
          repairRecords: true,
          consumables: true,
          accessories: true,
          networkInfo: true,
          actionPlan: true,
        },
      }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      household,
      categories,
      locations,
      homeAssets: assets.map((d) => serializeAsset(d)),
    };

    reply.header('Content-Type', 'application/json; charset=utf-8');
    reply.header(
      'Content-Disposition',
      `attachment; filename="homeasset-export-${new Date().toISOString().slice(0, 10)}.json"`
    );
    return payload;
  });
};

export default exportRoutes;
