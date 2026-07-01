import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_CATEGORIES, DEFAULT_LOCATIONS } from '@homeasset/shared';

const prisma = new PrismaClient();

async function main() {
  // 開発用デモユーザー
  const email = 'demo@example.com';
  const password = 'demo1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`既にseed済みです (user: ${email})`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: 'デモユーザー',
      passwordHash,
    },
  });

  const household = await prisma.household.create({
    data: {
      name: 'デモ家庭',
    },
  });

  await prisma.householdMember.create({
    data: {
      householdId: household.id,
      userId: user.id,
      role: 'owner',
    },
  });

  // 初期カテゴリ
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c, i) => ({
      householdId: household.id,
      name: c.name,
      icon: c.icon,
      assetType: c.asset_type ?? null,
      sortOrder: i,
    })),
  });

  // 初期設置場所（階層対応）
  // 親→子の順に作る必要があるため2パスで処理
  const parentMap = new Map<string, string>(); // name -> id
  for (let i = 0; i < DEFAULT_LOCATIONS.length; i++) {
    const loc = DEFAULT_LOCATIONS[i];
    if (loc.parent) continue;
    const created = await prisma.location.create({
      data: {
        householdId: household.id,
        name: loc.name,
        sortOrder: i,
      },
    });
    parentMap.set(loc.name, created.id);
  }
  for (let i = 0; i < DEFAULT_LOCATIONS.length; i++) {
    const loc = DEFAULT_LOCATIONS[i];
    if (!loc.parent) continue;
    const parentId = parentMap.get(loc.parent) ?? null;
    await prisma.location.create({
      data: {
        householdId: household.id,
        name: loc.name,
        parentId,
        sortOrder: i,
      },
    });
  }

  console.log(`seed 完了: ${email} / ${password}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
