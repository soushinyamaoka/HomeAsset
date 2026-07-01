import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import authPlugin from './plugins/auth';
import authRoutes from './routes/auth';
import homeAssetRoutes from './routes/homeAssets';
import categoryRoutes from './routes/categories';
import locationRoutes from './routes/locations';
import specRoutes from './routes/specs';
import linkRoutes from './routes/links';
import maintenanceRoutes from './routes/maintenance';
import repairRoutes from './routes/repairs';
import consumableRoutes from './routes/consumables';
import accessoryRoutes from './routes/accessories';
import actionPlanRoutes from './routes/actionPlans';
import networkRoutes from './routes/networkInfos';
import aiImportRoutes from './routes/aiImport';
import dashboardRoutes from './routes/dashboard';
import exportRoutes from './routes/exportData';
import householdRoutes from './routes/households';

async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // fastify@5 の既定JSONパーサは空ボディを拒否するので、空文字を{}として扱う
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    const text = (body as string) ?? '';
    if (text.trim() === '') {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(text));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(authPlugin);

  app.get('/health', async () => ({ status: 'ok' }));

  // 認証不要
  await app.register(authRoutes, { prefix: '/api/auth' });

  // 認証必須
  await app.register(async (instance) => {
    instance.addHook('preHandler', instance.authenticate);
    await instance.register(householdRoutes, { prefix: '/api/households' });
    await instance.register(homeAssetRoutes, { prefix: '/api/assets' });
    await instance.register(categoryRoutes, { prefix: '/api/categories' });
    await instance.register(locationRoutes, { prefix: '/api/locations' });
    await instance.register(specRoutes, { prefix: '/api' });
    await instance.register(linkRoutes, { prefix: '/api' });
    await instance.register(maintenanceRoutes, { prefix: '/api' });
    await instance.register(repairRoutes, { prefix: '/api' });
    await instance.register(consumableRoutes, { prefix: '/api' });
    await instance.register(accessoryRoutes, { prefix: '/api' });
    await instance.register(actionPlanRoutes, { prefix: '/api' });
    await instance.register(networkRoutes, { prefix: '/api' });
    await instance.register(aiImportRoutes, { prefix: '/api' });
    await instance.register(dashboardRoutes, { prefix: '/api/dashboard' });
    await instance.register(exportRoutes, { prefix: '/api/export' });
  });

  return app;
}

(async () => {
  try {
    const app = await buildServer();
    const port = Number(process.env.PORT) || 4001;
    const host = process.env.HOST || '0.0.0.0';
    await app.listen({ port, host });
    app.log.info(`HomeAsset API listening on http://${host}:${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
