import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { buildAiExport } from '../src/utils/aiExport';

const fixture = {
  householdName: 'テスト世帯',
  assets: [
    { id: 'a1', assetType: 'device', name: 'ルーター', status: 'active', priority: 'high', hasExtendedWarranty: true, purchaseDate: new Date('2024-01-02T00:00:00Z'), purchasePrice: new Prisma.Decimal('1200.50'), manufacturer: '', serialNumber: null, category: { name: 'ネットワーク', sortOrder: 1 }, location: { name: '書斎', parent: { name: '2階' } }, networkInfo: { ipAddress: '192.0.2.1', macAddress: '00:11:22:33:44:55', adminUrl: 'http://router.local' }, specs: [{ id: 's1', householdId: 'h1', assetId: 'a1', sortOrder: 2, createdAt: new Date(), specName: '速度', specValue: '1Gbps', unit: null, memo: '' }], links: [], maintenanceRecords: [{ id: 'm1', householdId: 'h1', assetId: 'a1', maintenanceDate: new Date('2025-04-05T00:00:00Z'), nextDueDate: new Date('2026-04-05T00:00:00Z'), createdAt: new Date(), updatedAt: new Date(), type: 'inspection', memo: '年次確認' }], repairRecords: [], consumables: [], accessories: [], actionPlan: null },
    { id: 'a2', assetType: 'furniture', name: '椅子', status: 'disposed', priority: 'low', hasExtendedWarranty: false, deletedAt: new Date('2025-02-03T00:00:00Z'), category: null, location: null, networkInfo: null, specs: [], links: [], maintenanceRecords: [], repairRecords: [], consumables: [], accessories: [], actionPlan: null },
  ],
};
function keys(value: unknown): string[] { if (Array.isArray(value)) return value.flatMap(keys); if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, child]) => [key, ...keys(child)]); return []; }
function scan(value: unknown): void { if (Array.isArray(value)) { for (const item of value) scan(item); return; } if (value && typeof value === 'object') { for (const [key, child] of Object.entries(value)) { assert.notEqual(child, null, `null at ${key}`); assert.notEqual(child, '', `empty string at ${key}`); assert.ok(!Array.isArray(child) || child.length > 0, `empty array at ${key}`); scan(child); } } }

const excluded = buildAiExport(fixture, { includeNetwork: false, exportedAt: new Date('2026-10-18T12:34:56.000Z') });
const included = buildAiExport(fixture, { includeNetwork: true });
const excludedJson = JSON.stringify(excluded);
assert.ok(excluded.assets.every((asset) => !keys(asset).includes('networkInfo')));
assert.equal(excluded.guide.networkInfo, 'excluded');
assert.ok(!excludedJson.includes('192.0.2.1') && !excludedJson.includes('00:11:22:33:44:55') && !excludedJson.includes('router.local'));
assert.ok(included.assets[0].networkInfo);
assert.ok(keys(included).includes('ipAddress') && keys(included).includes('macAddress') && keys(included).includes('adminUrl'));
for (const key of ['householdId','assetId','createdAt','updatedAt','sortOrder']) assert.ok(!keys(included).includes(key), `unexpected key ${key}`);
scan(included);
assert.match(String(excluded.assets[0].purchaseDate), /^\d{4}-\d{2}-\d{2}$/);
assert.equal(typeof excluded.assets[0].purchasePrice, 'number');
assert.equal(excluded.assets[1].status, 'disposed');
assert.equal(excluded.summary.assetCount, fixture.assets.length);
assert.equal(excluded.summary.byStatus.disposed, 1);
assert.equal((excluded.assets[0].location as string), '2階 > 書斎');
assert.equal(excluded.assets[0].hasExtendedWarranty, true);
assert.ok(!Object.hasOwn(excluded.assets[1], 'hasExtendedWarranty'));
for (const asset of excluded.assets) assert.equal(Object.keys(asset)[0], 'id');
const maintenance = excluded.assets[0].maintenanceRecords?.[0];
assert.match(String(maintenance?.maintenanceDate), /^\d{4}-\d{2}-\d{2}$/);
assert.match(String(maintenance?.nextDueDate), /^\d{4}-\d{2}-\d{2}$/);
assert.ok(!Object.hasOwn(maintenance ?? {}, 'id'));
process.stdout.write('[ai-export:selfcheck] fixture_assets=2 checks=network,privacy,empty-fields,dates,decimal,summary,warranty,asset-id,maintenance result=OK\n');
