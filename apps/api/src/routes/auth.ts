import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import {
  loginSchema,
  registerSchema,
  DEFAULT_CATEGORIES,
  DEFAULT_LOCATIONS,
} from '@homeasset/shared';
import { prisma } from '../lib/prisma';
import { parseBody } from '../utils/validate';

const authRoutes: FastifyPluginAsync = async (app) => {
  // 新規登録：ユーザー作成と同時に家庭(household)も作成し owner として紐づける
  app.post('/register', async (req, reply) => {
    const data = parseBody(registerSchema, req.body, reply);
    if (!data) return;

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) {
      return reply.code(409).send({ message: 'このメールアドレスは既に登録されています' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const { user, household, member } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: data.email, name: data.name, passwordHash },
      });
      const household = await tx.household.create({
        data: { name: data.householdName || `${data.name}の家` },
      });
      const member = await tx.householdMember.create({
        data: { userId: user.id, householdId: household.id, role: 'owner' },
      });
      // 初期カテゴリ
      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((c, i) => ({
          householdId: household.id,
          name: c.name,
          icon: c.icon,
          assetType: c.asset_type ?? null,
          sortOrder: i,
        })),
      });
      // 初期設置場所（階層あり）
      const parentMap = new Map<string, string>();
      for (let i = 0; i < DEFAULT_LOCATIONS.length; i++) {
        const loc = DEFAULT_LOCATIONS[i];
        if (loc.parent) continue;
        const created = await tx.location.create({
          data: { householdId: household.id, name: loc.name, sortOrder: i },
        });
        parentMap.set(loc.name, created.id);
      }
      for (let i = 0; i < DEFAULT_LOCATIONS.length; i++) {
        const loc = DEFAULT_LOCATIONS[i];
        if (!loc.parent) continue;
        await tx.location.create({
          data: {
            householdId: household.id,
            name: loc.name,
            parentId: parentMap.get(loc.parent) ?? null,
            sortOrder: i,
          },
        });
      }
      return { user, household, member };
    });

    const token = await reply.jwtSign({ userId: user.id });
    return reply.code(201).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        householdId: household.id,
        householdName: household.name,
        role: member.role,
      },
    });
  });

  // ログイン
  app.post('/login', async (req, reply) => {
    const data = parseBody(loginSchema, req.body, reply);
    if (!data) return;

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return reply.code(401).send({ message: 'メールアドレスかパスワードが違います' });

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) return reply.code(401).send({ message: 'メールアドレスかパスワードが違います' });

    const member = await prisma.householdMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      include: { household: true },
    });
    if (!member) return reply.code(403).send({ message: '所属している家庭が見つかりません' });

    const token = await reply.jwtSign({ userId: user.id });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        householdId: member.householdId,
        householdName: member.household.name,
        role: member.role,
      },
    };
  });

  // ログアウト（JWTはクライアント側で破棄するだけ）
  app.post('/logout', async () => ({ ok: true }));

  // 現在のユーザー
  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    const { userId, householdId, role } = req.auth;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const household = await prisma.household.findUnique({ where: { id: householdId } });
    if (!user || !household) throw new Error('not found');
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        householdId: household.id,
        householdName: household.name,
        role,
      },
    };
  });
};

export default authRoutes;
