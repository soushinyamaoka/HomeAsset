import type { FastifyPluginAsync } from 'fastify';
import { actionPlanInputSchema } from '@homeasset/shared';
import { prisma } from '../lib/prisma';
import { parseBody } from '../utils/validate';
import { ensureAssetInHousehold } from '../utils/asset-guard';

const actionPlanRoutes: FastifyPluginAsync = async (app) => {
  // 世帯の全アクション計画（ダッシュボード・一覧用）。資産名も同梱。
  app.get('/action-plans', async (req) => {
    return prisma.actionPlan.findMany({
      where: { householdId: req.auth.householdId },
      orderBy: [{ replacementYearFrom: 'asc' }, { updatedAt: 'desc' }],
      include: { asset: { select: { id: true, name: true, assetType: true } } },
    });
  });

  // 資産のアクション計画（無ければ null）
  app.get('/assets/:id/action-plan', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await ensureAssetInHousehold(id, req.auth.householdId, reply);
    if (!asset) return;
    return prisma.actionPlan.findUnique({ where: { assetId: id } });
  });

  // 作成 / 更新（1資産1件なので upsert）
  app.put('/assets/:id/action-plan', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await ensureAssetInHousehold(id, req.auth.householdId, reply);
    if (!asset) return;
    const data = parseBody(actionPlanInputSchema, req.body, reply);
    if (!data) return;

    const generatedAt =
      data.generatedAt && !Number.isNaN(new Date(data.generatedAt).getTime())
        ? new Date(data.generatedAt)
        : null;

    const fields = {
      managementPolicy: data.managementPolicy ?? null,
      actionPhase: data.actionPhase ?? null,
      nextAction: data.nextAction ?? null,
      professionalTrigger: data.professionalTrigger ?? null,
      estimateTiming: data.estimateTiming ?? null,
      replacementDecisionTiming: data.replacementDecisionTiming ?? null,
      replacementYearFrom: data.replacementYearFrom ?? null,
      replacementYearTo: data.replacementYearTo ?? null,
      replacementStatus: data.replacementStatus ?? null,
      replacementCostMin: data.replacementCostMin ?? null,
      replacementCostMax: data.replacementCostMax ?? null,
      routineCostMin: data.routineCostMin ?? null,
      routineCostMax: data.routineCostMax ?? null,
      professionalCostMin: data.professionalCostMin ?? null,
      professionalCostMax: data.professionalCostMax ?? null,
      baselineYear: data.baselineYear ?? null,
      priority: data.priority ?? null,
      notes: data.notes ?? [],
      source: data.source ?? 'ai_action_plan',
      schemaVersion: data.schemaVersion ?? null,
      generatedAt,
    };

    return prisma.actionPlan.upsert({
      where: { assetId: id },
      create: { householdId: req.auth.householdId, assetId: id, ...fields },
      update: fields,
    });
  });

  app.delete('/assets/:id/action-plan', async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await ensureAssetInHousehold(id, req.auth.householdId, reply);
    if (!asset) return;
    const existing = await prisma.actionPlan.findUnique({ where: { assetId: id } });
    if (!existing) return reply.code(404).send({ message: 'アクション計画が見つかりません' });
    await prisma.actionPlan.delete({ where: { assetId: id } });
    return reply.code(204).send();
  });
};

export default actionPlanRoutes;
