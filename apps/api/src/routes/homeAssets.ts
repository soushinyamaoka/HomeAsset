import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { assetInputSchema, assetListQuerySchema } from '@homeasset/shared';
import { prisma } from '../lib/prisma';
import { parseBody } from '../utils/validate';
import { parseDateOnly } from '../utils/date';
import { serializeAsset } from '../utils/serialize';

const homeAssetRoutes: FastifyPluginAsync = async (app) => {
  // 一覧
  app.get('/', async (req, reply) => {
    const parsed = assetListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ message: '検索条件が不正です', errors: parsed.error.flatten() });
    }
    const q = parsed.data;
    const where: Prisma.HomeAssetWhereInput = {
      householdId: req.auth.householdId,
      deletedAt: q.includeDisposed ? undefined : null,
    };

    if (q.search) {
      const s = q.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { manufacturer: { contains: s, mode: 'insensitive' } },
        { modelNumber: { contains: s, mode: 'insensitive' } },
        { serialNumber: { contains: s, mode: 'insensitive' } },
        { contractorName: { contains: s, mode: 'insensitive' } },
        { memo: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (q.assetType) where.assetType = q.assetType;
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.locationId) where.locationId = q.locationId;
    if (q.status) where.status = q.status;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const in30 = new Date(today);
    in30.setUTCDate(in30.getUTCDate() + 30);

    if (q.warrantyFilter === 'expiring_soon') {
      where.warrantyEndDate = { gte: today, lte: in30 };
    } else if (q.warrantyFilter === 'expired') {
      where.warrantyEndDate = { lt: today };
    } else if (q.warrantyFilter === 'none') {
      where.warrantyEndDate = null;
    }

    const isNextMaintenanceSort = q.sort === 'next_maintenance_asc';

    const orderBy: Prisma.HomeAssetOrderByWithRelationInput = (() => {
      switch (q.sort) {
        case 'created_desc':
          return { createdAt: 'desc' };
        case 'name_asc':
          return { name: 'asc' };
        case 'warranty_asc':
          return { warrantyEndDate: 'asc' };
        case 'purchase_desc':
          return { purchaseDate: 'desc' };
        case 'installed_desc':
          return { installedDate: 'desc' };
        case 'construction_desc':
          return { constructionDate: 'desc' };
        case 'next_maintenance_asc':
        case 'updated_desc':
        default:
          return { updatedAt: 'desc' };
      }
    })();

    const assets = await prisma.homeAsset.findMany({
      where,
      orderBy,
      include: {
        category: true,
        location: true,
        ...(isNextMaintenanceSort
          ? {
              maintenanceRecords: {
                where: { nextDueDate: { not: null } },
                orderBy: { nextDueDate: 'asc' },
                take: 1,
                select: { nextDueDate: true },
              },
            }
          : {}),
      },
      take: 500,
    });

    if (isNextMaintenanceSort) {
      assets.sort((a, b) => {
        const aDate = (a as any).maintenanceRecords?.[0]?.nextDueDate as Date | undefined;
        const bDate = (b as any).maintenanceRecords?.[0]?.nextDueDate as Date | undefined;
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return aDate.getTime() - bDate.getTime();
      });
      for (const d of assets as any[]) delete d.maintenanceRecords;
    }

    return assets.map((d) => serializeAsset(d));
  });

  // 詳細
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await prisma.homeAsset.findFirst({
      where: { id, householdId: req.auth.householdId },
      include: {
        category: true,
        location: true,
        specs: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        links: { orderBy: { createdAt: 'asc' } },
        maintenanceRecords: { orderBy: { maintenanceDate: 'desc' } },
        repairRecords: { orderBy: { occurredDate: 'desc' } },
        consumables: { orderBy: { createdAt: 'asc' } },
        accessories: { orderBy: { createdAt: 'asc' } },
        networkInfo: true,
        actionPlan: true,
      },
    });
    if (!asset) return reply.code(404).send({ message: '資産が見つかりません' });
    return serializeAsset(asset);
  });

  // 新規作成
  app.post('/', async (req, reply) => {
    const data = parseBody(assetInputSchema, req.body, reply);
    if (!data) return;

    const asset = await prisma.homeAsset.create({
      data: {
        householdId: req.auth.householdId,
        name: data.name,
        assetType: data.assetType,
        categoryId: data.categoryId || null,
        manufacturer: data.manufacturer,
        modelNumber: data.modelNumber,
        serialNumber: data.serialNumber,
        locationId: data.locationId || null,
        status: data.status,
        priority: data.priority,
        purchaseDate: parseDateOnly(data.purchaseDate),
        installedDate: parseDateOnly(data.installedDate),
        constructionDate: parseDateOnly(data.constructionDate),
        purchaseStore: data.purchaseStore,
        contractorName: data.contractorName,
        contractorContact: data.contractorContact,
        contactPerson: data.contactPerson,
        purchasePrice: data.purchasePrice ?? null,
        constructionCost: data.constructionCost ?? null,
        purchaseUrl: data.purchaseUrl,
        orderNumber: data.orderNumber,
        contractNumber: data.contractNumber,
        receiptUrl: data.receiptUrl,
        constructionDocumentUrl: data.constructionDocumentUrl,
        warrantyStartDate: parseDateOnly(data.warrantyStartDate),
        warrantyEndDate: parseDateOnly(data.warrantyEndDate),
        hasExtendedWarranty: data.hasExtendedWarranty ?? false,
        warrantyMemo: data.warrantyMemo,
        manualUrl: data.manualUrl,
        supportUrl: data.supportUrl,
        officialUrl: data.officialUrl,
        photoUrl: data.photoUrl,
        labelPhotoUrl: data.labelPhotoUrl,
        beforePhotoUrl: data.beforePhotoUrl,
        afterPhotoUrl: data.afterPhotoUrl,
        expectedLifespanYears: data.expectedLifespanYears ?? null,
        replacementDueDate: parseDateOnly(data.replacementDueDate),
        memo: data.memo,
      },
      include: { category: true, location: true },
    });
    return reply.code(201).send(serializeAsset(asset));
  });

  // 更新
  app.put('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const exists = await prisma.homeAsset.findFirst({
      where: { id, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: '資産が見つかりません' });

    const data = parseBody(assetInputSchema, req.body, reply);
    if (!data) return;

    const updated = await prisma.homeAsset.update({
      where: { id },
      data: {
        name: data.name,
        assetType: data.assetType,
        categoryId: data.categoryId || null,
        manufacturer: data.manufacturer ?? null,
        modelNumber: data.modelNumber ?? null,
        serialNumber: data.serialNumber ?? null,
        locationId: data.locationId || null,
        status: data.status,
        priority: data.priority,
        purchaseDate: parseDateOnly(data.purchaseDate),
        installedDate: parseDateOnly(data.installedDate),
        constructionDate: parseDateOnly(data.constructionDate),
        purchaseStore: data.purchaseStore ?? null,
        contractorName: data.contractorName ?? null,
        contractorContact: data.contractorContact ?? null,
        contactPerson: data.contactPerson ?? null,
        purchasePrice: data.purchasePrice ?? null,
        constructionCost: data.constructionCost ?? null,
        purchaseUrl: data.purchaseUrl ?? null,
        orderNumber: data.orderNumber ?? null,
        contractNumber: data.contractNumber ?? null,
        receiptUrl: data.receiptUrl ?? null,
        constructionDocumentUrl: data.constructionDocumentUrl ?? null,
        warrantyStartDate: parseDateOnly(data.warrantyStartDate),
        warrantyEndDate: parseDateOnly(data.warrantyEndDate),
        hasExtendedWarranty: data.hasExtendedWarranty ?? false,
        warrantyMemo: data.warrantyMemo ?? null,
        manualUrl: data.manualUrl ?? null,
        supportUrl: data.supportUrl ?? null,
        officialUrl: data.officialUrl ?? null,
        photoUrl: data.photoUrl ?? null,
        labelPhotoUrl: data.labelPhotoUrl ?? null,
        beforePhotoUrl: data.beforePhotoUrl ?? null,
        afterPhotoUrl: data.afterPhotoUrl ?? null,
        expectedLifespanYears: data.expectedLifespanYears ?? null,
        replacementDueDate: parseDateOnly(data.replacementDueDate),
        memo: data.memo ?? null,
      },
      include: { category: true, location: true },
    });
    return serializeAsset(updated);
  });

  // 物理削除（誤登録用）
  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const exists = await prisma.homeAsset.findFirst({
      where: { id, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: '資産が見つかりません' });
    await prisma.homeAsset.delete({ where: { id } });
    return reply.code(204).send();
  });

  // 廃棄済みに変更（論理削除）
  app.post('/:id/dispose', async (req, reply) => {
    const { id } = req.params as { id: string };
    const exists = await prisma.homeAsset.findFirst({
      where: { id, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: '資産が見つかりません' });
    const updated = await prisma.homeAsset.update({
      where: { id },
      data: { status: 'disposed', deletedAt: new Date() },
    });
    return serializeAsset(updated);
  });

  // 交換済みに変更（履歴として残す）
  app.post('/:id/replace', async (req, reply) => {
    const { id } = req.params as { id: string };
    const exists = await prisma.homeAsset.findFirst({
      where: { id, householdId: req.auth.householdId },
    });
    if (!exists) return reply.code(404).send({ message: '資産が見つかりません' });
    const updated = await prisma.homeAsset.update({
      where: { id },
      data: { status: 'replaced' },
    });
    return serializeAsset(updated);
  });
};

export default homeAssetRoutes;
