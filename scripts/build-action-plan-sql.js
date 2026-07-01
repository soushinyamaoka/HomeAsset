// 構造化アクション計画JSON -> action_plans への upsert SQL を生成する。
// 使い方: node build-action-plan-sql.js <input.json> <output.sql>
// - asset_id で対象 home_assets を引き、household_id を継承（資産が無ければその行はスキップ）
// - ON CONFLICT (asset_id) DO UPDATE で再投入(再生成)にも対応
const fs = require('fs');
const path = require('path');

const [, , jsonPath, outPath] = process.argv;
if (!jsonPath || !outPath) {
  console.error('usage: node build-action-plan-sql.js <input.json> <output.sql>');
  process.exit(1);
}

const doc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const meta = doc.metadata || {};
const plans = doc.asset_action_plans || [];

// 文字列リテラル（NULL対応・シングルクオートエスケープ）
const q = (v) =>
  v === null || v === undefined || v === '' ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'";
// 整数リテラル
const qi = (v) => {
  if (v === null || v === undefined || v === '') return 'NULL';
  const n = Math.trunc(Number(v));
  return Number.isNaN(n) ? 'NULL' : String(n);
};
// text[] リテラル
const qarr = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return 'ARRAY[]::text[]';
  return 'ARRAY[' + arr.map((s) => "'" + String(s).replace(/'/g, "''") + "'").join(',') + ']::text[]';
};

// generated_at -> UTC の timestamp リテラル
let genLit = 'NULL';
if (meta.generated_at) {
  const dt = new Date(meta.generated_at);
  if (!Number.isNaN(dt.getTime())) {
    genLit = "'" + dt.toISOString().replace('T', ' ').replace('Z', '') + "'::timestamp";
  }
}
const schemaVer = q(meta.schema_version);

const out = [];
out.push('-- action_plans upsert generated from ' + path.basename(jsonPath));
out.push('-- household=' + (meta.household && meta.household.id) + ' plans=' + plans.length);
out.push('');

for (const p of plans) {
  const rw = p.replacement_window || {};
  const costs = p.costs || {};
  const rc = costs.replacement_cost || {};
  const ro = costs.routine_self_maintenance_cost || {};
  const pf = costs.professional_service_cost_if_needed || {};

  out.push(`INSERT INTO action_plans (
  id, household_id, asset_id,
  management_policy, action_phase, next_action, professional_trigger, estimate_timing, replacement_decision_timing,
  replacement_year_from, replacement_year_to, replacement_status,
  replacement_cost_min, replacement_cost_max, routine_cost_min, routine_cost_max, professional_cost_min, professional_cost_max,
  baseline_year, priority, notes, source, schema_version, generated_at, created_at, updated_at
)
SELECT gen_random_uuid()::text, ha.household_id, ha.id,
  ${q(p.management_policy)}, ${q(p.action_phase)}, ${q(p.next_action)}, ${q(p.professional_consultation_trigger)}, ${q(p.estimate_timing)}, ${q(p.replacement_decision_timing)},
  ${qi(rw.from_year)}, ${qi(rw.to_year)}, ${q(rw.status)},
  ${qi(rc.min)}, ${qi(rc.max)}, ${qi(ro.min)}, ${qi(ro.max)}, ${qi(pf.min)}, ${qi(pf.max)},
  ${qi(p.baseline_year)}, ${q(p.priority)}, ${qarr(p.notes)}, 'ai_action_plan', ${schemaVer}, ${genLit}, now(), now()
FROM home_assets ha WHERE ha.id = ${q(p.asset_id)}
ON CONFLICT (asset_id) DO UPDATE SET
  management_policy = EXCLUDED.management_policy,
  action_phase = EXCLUDED.action_phase,
  next_action = EXCLUDED.next_action,
  professional_trigger = EXCLUDED.professional_trigger,
  estimate_timing = EXCLUDED.estimate_timing,
  replacement_decision_timing = EXCLUDED.replacement_decision_timing,
  replacement_year_from = EXCLUDED.replacement_year_from,
  replacement_year_to = EXCLUDED.replacement_year_to,
  replacement_status = EXCLUDED.replacement_status,
  replacement_cost_min = EXCLUDED.replacement_cost_min,
  replacement_cost_max = EXCLUDED.replacement_cost_max,
  routine_cost_min = EXCLUDED.routine_cost_min,
  routine_cost_max = EXCLUDED.routine_cost_max,
  professional_cost_min = EXCLUDED.professional_cost_min,
  professional_cost_max = EXCLUDED.professional_cost_max,
  baseline_year = EXCLUDED.baseline_year,
  priority = EXCLUDED.priority,
  notes = EXCLUDED.notes,
  source = EXCLUDED.source,
  schema_version = EXCLUDED.schema_version,
  generated_at = EXCLUDED.generated_at,
  updated_at = now();`);
}

fs.writeFileSync(outPath, out.join('\n') + '\n', { encoding: 'utf8' });
console.error('wrote ' + plans.length + ' upsert statements to ' + outPath);
