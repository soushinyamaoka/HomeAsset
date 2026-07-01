import type { FastifyPluginAsync } from 'fastify';
import {
  aiImportPayloadSchema,
  aiImportApplySchema,
  aiImportCreateAndApplySchema,
} from '@homeasset/shared';
import { prisma } from '../lib/prisma';
import { serializeAsset } from '../utils/serialize';

const aiImportRoutes: FastifyPluginAsync = async (app) => {
  // AI回答の生JSON文字列を受け取り、パースしてプレビュー用に整形
  app.post('/ai-import/parse', async (req, reply) => {
    const body = req.body as { rawJson?: string; assetId?: string };
    if (!body?.rawJson || typeof body.rawJson !== 'string') {
      return reply.code(400).send({ message: 'rawJson が必要です' });
    }
    let json: unknown;
    try {
      json = JSON.parse(body.rawJson);
    } catch (e) {
      return reply
        .code(400)
        .send({ message: 'JSONとして解析できませんでした', detail: String(e) });
    }
    const result = aiImportPayloadSchema.safeParse(json);
    if (!result.success) {
      return reply.code(400).send({
        message: 'AI回答の構造が想定と異なります',
        errors: result.error.flatten(),
      });
    }

    let existingAsset: any = null;
    if (body.assetId) {
      existingAsset = await prisma.homeAsset.findFirst({
        where: { id: body.assetId, householdId: req.auth.householdId },
      });
    }

    return {
      payload: result.data,
      existingAsset: existingAsset ? serializeAsset(existingAsset) : null,
    };
  });

  // 既存資産にAI回答を反映（overwrite=false: 空欄項目のみ）
  app.post('/assets/:id/ai-import/apply', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await prisma.homeAsset.findFirst({
      where: { id, householdId: req.auth.householdId },
    });
    if (!asset) return reply.code(404).send({ message: '資産が見つかりません' });

    const parsed = aiImportApplySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ message: '入力内容が不正です', errors: parsed.error.flatten() });
    }
    const { payload, overwrite, applySpecs, applyLinks, applyConsumables, applyAccessories } =
      parsed.data;

    // 資産の基本情報更新
    const assetUpdate: Record<string, any> = {};
    const a = payload.asset;
    if (a) {
      const apply = (field: string, val: string | undefined | null) => {
        if (val == null || val === '') return;
        const current = (asset as any)[field];
        if (overwrite || current == null || current === '') {
          assetUpdate[field] = val;
        }
      };
      apply('name', a.name);
      apply('manufacturer', a.manufacturer);
      apply('modelNumber', a.model_number);
      if (a.asset_type) {
        if (overwrite || !asset.assetType) {
          assetUpdate.assetType = a.asset_type;
        }
      }
      // summaryはmemoに（既存があれば追記）
      if (a.summary) {
        if (overwrite || !asset.memo) {
          assetUpdate.memo = a.summary;
        } else if (!asset.memo.includes(a.summary)) {
          assetUpdate.memo = `${asset.memo}\n\n${a.summary}`;
        }
      }
    }

    if (Object.keys(assetUpdate).length > 0) {
      await prisma.homeAsset.update({ where: { id }, data: assetUpdate });
    }

    // specs
    let specsCreated = 0;
    if (applySpecs && payload.specs?.length) {
      const existingSpecs = await prisma.assetSpec.findMany({
        where: { assetId: id },
        select: { specName: true },
      });
      const existingNames = new Set(existingSpecs.map((s) => s.specName));
      const toCreate = payload.specs.filter((s) => overwrite || !existingNames.has(s.spec_name));
      if (toCreate.length > 0) {
        await prisma.assetSpec.createMany({
          data: toCreate.map((s, i) => ({
            householdId: req.auth.householdId,
            assetId: id,
            specName: s.spec_name,
            specValue: s.spec_value ?? null,
            unit: s.unit ?? null,
            memo: s.memo ?? null,
            sortOrder: i,
          })),
        });
        specsCreated = toCreate.length;
      }
    }

    // links
    let linksCreated = 0;
    if (applyLinks && payload.links?.length) {
      const existingLinks = await prisma.assetLink.findMany({
        where: { assetId: id },
        select: { url: true },
      });
      const existingUrls = new Set(existingLinks.map((l) => l.url));
      const toCreate = payload.links.filter((l) => overwrite || !existingUrls.has(l.url));
      if (toCreate.length > 0) {
        await prisma.assetLink.createMany({
          data: toCreate.map((l) => ({
            householdId: req.auth.householdId,
            assetId: id,
            linkType: l.link_type,
            title: l.title ?? null,
            url: l.url,
            memo: l.memo ?? null,
          })),
        });
        linksCreated = toCreate.length;
      }
    }

    // consumables
    let consumablesCreated = 0;
    if (applyConsumables && payload.consumables?.length) {
      const existing = await prisma.consumable.findMany({
        where: { assetId: id },
        select: { name: true },
      });
      const existingNames = new Set(existing.map((c) => c.name));
      const toCreate = payload.consumables.filter(
        (c) => overwrite || !existingNames.has(c.name)
      );
      if (toCreate.length > 0) {
        await prisma.consumable.createMany({
          data: toCreate.map((c) => ({
            householdId: req.auth.householdId,
            assetId: id,
            name: c.name,
            manufacturer: c.manufacturer ?? null,
            modelNumber: c.model_number ?? null,
            replacementIntervalText: c.replacement_interval_text ?? null,
            purchaseUrl: c.purchase_url ?? null,
            memo: c.memo ?? null,
          })),
        });
        consumablesCreated = toCreate.length;
      }
    }

    // accessories
    let accessoriesCreated = 0;
    if (applyAccessories && payload.accessories?.length) {
      const existing = await prisma.accessory.findMany({
        where: { assetId: id },
        select: { name: true },
      });
      const existingNames = new Set(existing.map((a) => a.name));
      const toCreate = payload.accessories.filter(
        (a) => overwrite || !existingNames.has(a.name)
      );
      if (toCreate.length > 0) {
        await prisma.accessory.createMany({
          data: toCreate.map((a) => ({
            householdId: req.auth.householdId,
            assetId: id,
            name: a.name,
            quantity: a.quantity ?? null,
            memo: a.memo ?? null,
          })),
        });
        accessoriesCreated = toCreate.length;
      }
    }

    // ログ
    await prisma.aiImportLog.create({
      data: {
        householdId: req.auth.householdId,
        assetId: id,
        parsedJson: payload as any,
        memo: 'apply',
      },
    });

    return {
      ok: true,
      counts: {
        assetFieldsUpdated: Object.keys(assetUpdate).length,
        specsCreated,
        linksCreated,
        consumablesCreated,
        accessoriesCreated,
      },
    };
  });

  // 新規資産を作成しつつ AI 回答を反映
  app.post('/ai-import/create-and-apply', async (req, reply) => {
    const parsed = aiImportCreateAndApplySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ message: '入力内容が不正です', errors: parsed.error.flatten() });
    }
    const {
      asset: assetInput,
      payload,
      applySpecs,
      applyLinks,
      applyConsumables,
      applyAccessories,
    } = parsed.data;
    const householdId = req.auth.householdId;

    if (assetInput.categoryId) {
      const cat = await prisma.category.findFirst({
        where: { id: assetInput.categoryId, householdId },
      });
      if (!cat) return reply.code(400).send({ message: 'カテゴリが見つかりません' });
    }
    if (assetInput.locationId) {
      const loc = await prisma.location.findFirst({
        where: { id: assetInput.locationId, householdId },
      });
      if (!loc) return reply.code(400).send({ message: '設置場所が見つかりません' });
    }

    const aiAsset = payload.asset ?? {};
    const name = assetInput.name || aiAsset.name || '';
    if (!name) {
      return reply.code(400).send({ message: '名称を入力してください' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.homeAsset.create({
        data: {
          householdId,
          name,
          assetType: assetInput.assetType ?? aiAsset.asset_type ?? 'device',
          categoryId: assetInput.categoryId || null,
          locationId: assetInput.locationId || null,
          status: assetInput.status,
          priority: assetInput.priority,
          manufacturer: aiAsset.manufacturer ?? null,
          modelNumber: aiAsset.model_number ?? null,
          memo: aiAsset.summary ?? null,
        },
      });

      let specsCreated = 0;
      if (applySpecs && payload.specs?.length) {
        await tx.assetSpec.createMany({
          data: payload.specs.map((s, i) => ({
            householdId,
            assetId: created.id,
            specName: s.spec_name,
            specValue: s.spec_value ?? null,
            unit: s.unit ?? null,
            memo: s.memo ?? null,
            sortOrder: i,
          })),
        });
        specsCreated = payload.specs.length;
      }

      let linksCreated = 0;
      if (applyLinks && payload.links?.length) {
        await tx.assetLink.createMany({
          data: payload.links.map((l) => ({
            householdId,
            assetId: created.id,
            linkType: l.link_type,
            title: l.title ?? null,
            url: l.url,
            memo: l.memo ?? null,
          })),
        });
        linksCreated = payload.links.length;
      }

      let consumablesCreated = 0;
      if (applyConsumables && payload.consumables?.length) {
        await tx.consumable.createMany({
          data: payload.consumables.map((c) => ({
            householdId,
            assetId: created.id,
            name: c.name,
            manufacturer: c.manufacturer ?? null,
            modelNumber: c.model_number ?? null,
            replacementIntervalText: c.replacement_interval_text ?? null,
            purchaseUrl: c.purchase_url ?? null,
            memo: c.memo ?? null,
          })),
        });
        consumablesCreated = payload.consumables.length;
      }

      let accessoriesCreated = 0;
      if (applyAccessories && payload.accessories?.length) {
        await tx.accessory.createMany({
          data: payload.accessories.map((a) => ({
            householdId,
            assetId: created.id,
            name: a.name,
            quantity: a.quantity ?? null,
            memo: a.memo ?? null,
          })),
        });
        accessoriesCreated = payload.accessories.length;
      }

      await tx.aiImportLog.create({
        data: {
          householdId,
          assetId: created.id,
          parsedJson: payload as any,
          memo: 'create-and-apply',
        },
      });

      const detail = await tx.homeAsset.findFirst({
        where: { id: created.id, householdId },
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
        },
      });

      return {
        asset: detail,
        counts: { specsCreated, linksCreated, consumablesCreated, accessoriesCreated },
      };
    });

    return reply.code(201).send({
      asset: result.asset ? serializeAsset(result.asset) : null,
      counts: result.counts,
    });
  });
};

export default aiImportRoutes;
