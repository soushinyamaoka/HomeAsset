import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { formatDateOnly } from '../utils/date';

function pickSummary(d: any) {
  return {
    id: d.id,
    name: d.name,
    assetType: d.assetType,
    manufacturer: d.manufacturer,
    modelNumber: d.modelNumber,
    status: d.status,
    categoryName: d.category?.name ?? null,
    locationName: d.location?.name ?? null,
    warrantyEndDate: formatDateOnly(d.warrantyEndDate),
    nextMaintenanceDate: d.nextMaintenanceDate ?? null,
  };
}

const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (req) => {
    const householdId = req.auth.householdId;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const in30 = new Date(today);
    in30.setUTCDate(in30.getUTCDate() + 30);

    const baseInclude = { category: true, location: true } as const;
    const baseWhere = { householdId, deletedAt: null } as const;

    const [
      assetCount,
      expiringSoon,
      expired,
      broken,
      replacementPlanned,
      recent,
      maintenances,
    ] = await Promise.all([
      prisma.homeAsset.count({ where: baseWhere }),
      prisma.homeAsset.findMany({
        where: { ...baseWhere, warrantyEndDate: { gte: today, lte: in30 } },
        include: baseInclude,
        orderBy: { warrantyEndDate: 'asc' },
        take: 20,
      }),
      prisma.homeAsset.findMany({
        where: { ...baseWhere, warrantyEndDate: { lt: today } },
        include: baseInclude,
        orderBy: { warrantyEndDate: 'desc' },
        take: 20,
      }),
      prisma.homeAsset.findMany({
        where: { ...baseWhere, status: { in: ['broken', 'repairing'] } },
        include: baseInclude,
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      prisma.homeAsset.findMany({
        where: { ...baseWhere, status: 'replacement_planned' },
        include: baseInclude,
        orderBy: { replacementDueDate: 'asc' },
        take: 20,
      }),
      prisma.homeAsset.findMany({
        where: baseWhere,
        include: baseInclude,
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      prisma.maintenanceRecord.findMany({
        where: { householdId, nextDueDate: { gte: today, lte: in30 } },
        include: {
          asset: { include: baseInclude },
        },
        orderBy: { nextDueDate: 'asc' },
        take: 30,
      }),
    ]);

    // 情報不足の資産
    const incompleteAssets = await prisma.homeAsset.findMany({
      where: {
        ...baseWhere,
        OR: [{ modelNumber: null }, { modelNumber: '' }, { locationId: null }],
      },
      include: baseInclude,
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    // 次回メンテナンス資産をユニーク化
    const seenIds = new Set<string>();
    const upcomingMaintenanceAssets = maintenances
      .filter((m) => m.asset.deletedAt === null)
      .filter((m) => {
        if (seenIds.has(m.assetId)) return false;
        seenIds.add(m.assetId);
        return true;
      })
      .map((m) => ({
        ...pickSummary(m.asset),
        nextMaintenanceDate: formatDateOnly(m.nextDueDate),
      }));

    return {
      assetCount,
      warrantyExpiringSoonAssets: expiringSoon.map(pickSummary),
      warrantyExpiredAssets: expired.map(pickSummary),
      upcomingMaintenanceAssets,
      brokenAssets: broken.map(pickSummary),
      replacementPlannedAssets: replacementPlanned.map(pickSummary),
      recentAssets: recent.map(pickSummary),
      incompleteAssets: incompleteAssets.map(pickSummary),
    };
  });
};

export default dashboardRoutes;
