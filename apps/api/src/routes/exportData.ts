import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { serializeAsset } from '../utils/serialize';

const exportRoutes: FastifyPluginAsync = async (app) => {
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
