<#
.SYNOPSIS
  構造化アクション計画JSONを DB の action_plans へ投入（upsert）する。

.DESCRIPTION
  1. JSON から upsert SQL を生成（build-action-plan-sql.js / asset_id 一致・household継承）。
  2. 対象DBに action_plans テーブルがあるか確認（無ければ deploy を促す）。
  3. 投入前に action_plans を data-only バックアップ。
  4. 単一トランザクション（ON_ERROR_STOP）で適用 → 失敗時は自動ロールバック。
  5. 件数とサンプルを検証表示。

.PARAMETER Target
  local（既定, localhost:5433 の homeasset-postgres）/ vps（ssh vps の homeasset-postgres-prod）。
  ※ local は資産31件、vps は64件のため、投入件数は対象DBの資産数に一致する。

.PARAMETER DryRun
  生成SQLの先頭だけ表示して、投入は行わない。

.EXAMPLE
  npm run import:action-plans
  npm run import:action-plans -- -Target vps
  npm run import:action-plans -- -DryRun
#>
param(
  [string]$JsonPath = 'exports/20260605_115700/plan/homeasset_practical_action_plan_structured.json',
  [ValidateSet('local', 'vps')]
  [string]$Target = 'local',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$ts = Get-Date -Format 'yyyyMMdd_HHmmss'

Push-Location $Root
try {
  $jsonFull = Join-Path $Root $JsonPath
  if (-not (Test-Path $jsonFull)) { throw "JSONが見つかりません: $jsonFull" }
  $sqlDir = Split-Path -Parent $jsonFull
  $sqlName = "_action_plans_import.sql"
  $sqlFull = Join-Path $sqlDir $sqlName

  Write-Host '== [1/5] upsert SQL を生成 ==' -ForegroundColor Cyan
  node (Join-Path $Root 'scripts/build-action-plan-sql.js') $jsonFull $sqlFull
  if ($LASTEXITCODE -ne 0) { throw 'SQL生成に失敗しました' }
  $stmtCount = (Select-String -Path $sqlFull -Pattern '^INSERT INTO action_plans').Count
  Write-Host ("  生成: {0}（INSERT {1}件）" -f $sqlFull, $stmtCount) -ForegroundColor Green

  if ($DryRun) {
    Write-Host '== DryRun: SQL先頭40行 ==' -ForegroundColor Yellow
    Get-Content $sqlFull -Encoding UTF8 -TotalCount 40
    return
  }

  # 対象別の psql/pg_dump 実行ヘルパー
  $container = if ($Target -eq 'vps') { 'homeasset-postgres-prod' } else { 'homeasset-postgres' }
  function Invoke-TargetSql([string]$sql) {
    if ($Target -eq 'vps') {
      return ($sql | ssh vps "docker exec -i $container psql -U homeasset -d homeasset -t -A")
    }
    return ($sql | docker exec -i $container psql -U homeasset -d homeasset -t -A)
  }

  Write-Host "== [2/5] テーブル存在チェック ($Target) ==" -ForegroundColor Cyan
  $exists = (Invoke-TargetSql "SELECT to_regclass('public.action_plans') IS NOT NULL;").Trim()
  if ($exists -ne 't') {
    throw "action_plans テーブルが $Target にありません。先に『npm run deploy』で本番にマイグレーションを反映してください。"
  }

  Write-Host '== [3/5] 投入前バックアップ（action_plans data-only）==' -ForegroundColor Cyan
  $bdir = Join-Path $Root 'backups'
  New-Item -ItemType Directory -Force -Path $bdir | Out-Null
  $bkName = "action_plans_${Target}_${ts}.sql"
  if ($Target -eq 'vps') {
    ssh vps "docker exec $container pg_dump -U homeasset -d homeasset --data-only --table=action_plans -f /tmp/$bkName && docker cp ${container}:/tmp/$bkName homeasset/backups/$bkName && docker exec $container rm -f /tmp/$bkName && echo OK"
    if ($LASTEXITCODE -ne 0) { throw 'VPSバックアップに失敗しました' }
    Push-Location $bdir; try { scp "vps:homeasset/backups/$bkName" . } finally { Pop-Location }
  }
  else {
    docker exec $container pg_dump -U homeasset -d homeasset --data-only --table=action_plans -f "/tmp/$bkName" | Out-Null
    docker cp "${container}:/tmp/$bkName" (Join-Path $bdir $bkName) | Out-Null
    docker exec $container rm -f "/tmp/$bkName" | Out-Null
  }
  Write-Host ("  backups/$bkName") -ForegroundColor Green

  Write-Host "== [4/5] 投入（単一トランザクション）==" -ForegroundColor Cyan
  if ($Target -eq 'vps') {
    Push-Location $sqlDir
    try { scp $sqlName "vps:/tmp/ap_import_$ts.sql" } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw 'SQL転送に失敗しました' }
    ssh vps "docker cp /tmp/ap_import_$ts.sql ${container}:/tmp/ap_import.sql && docker exec $container psql -U homeasset -d homeasset --single-transaction -v ON_ERROR_STOP=1 -q -f /tmp/ap_import.sql && docker exec $container rm -f /tmp/ap_import.sql && rm -f /tmp/ap_import_$ts.sql && echo APPLIED"
    if ($LASTEXITCODE -ne 0) { throw 'VPSへの投入に失敗しました（ロールバック済み）' }
  }
  else {
    docker cp $sqlFull "${container}:/tmp/ap_import.sql" | Out-Null
    docker exec $container psql -U homeasset -d homeasset --single-transaction -v ON_ERROR_STOP=1 -q -f /tmp/ap_import.sql
    if ($LASTEXITCODE -ne 0) { throw 'ローカルへの投入に失敗しました（ロールバック済み）' }
    docker exec $container rm -f /tmp/ap_import.sql | Out-Null
  }
  Write-Host '  適用しました' -ForegroundColor Green

  Write-Host "== [5/5] 検証 ==" -ForegroundColor Cyan
  $count = (Invoke-TargetSql "SELECT count(*) FROM action_plans;").Trim()
  Write-Host ("  action_plans 件数: {0}" -f $count)
  Write-Host '  サンプル(3件):'
  Invoke-TargetSql "SELECT a.name || ' | ' || coalesce(p.management_policy,'') || ' | 更新' || coalesce(p.replacement_year_from::text,'-') || '-' || coalesce(p.replacement_year_to::text,'-') FROM action_plans p JOIN home_assets a ON a.id=p.asset_id ORDER BY p.replacement_year_from LIMIT 3;"
}
finally { Pop-Location }
