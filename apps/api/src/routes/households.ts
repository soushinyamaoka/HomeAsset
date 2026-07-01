import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';

const householdRoutes: FastifyPluginAsync = async (app) => {
  app.get('/current', async (req) => {
    const household = await prisma.household.findUnique({ where: { id: req.auth.householdId } });
    return household;
  });

  app.get('/current/members', async (req) => {
    const members = await prisma.householdMember.findMany({
      where: { householdId: req.auth.householdId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
    }));
  });
};

export default householdRoutes;
