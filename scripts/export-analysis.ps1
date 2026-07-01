<#
.SYNOPSIS
  VPS の DB から分析用データを抽出する（全ID付き）。

.DESCRIPTION
  ssh vps 経由（psql の COPY / json_agg）で、DB を外部公開せずにローカルへ出力する。
  出力先: exports/<日時>/
    - <table>.csv          テーブル別CSV（UTF-8 BOM、全ID・外部キー付き／更新の往復用）
    - _assets_overview.csv 資産1行＝カテゴリ名/設置場所名・各子テーブル件数 を結合（人向け集計）
    - export.json          資産に子テーブルをぶら下げたネストJSON（全ID付き／AI分析・俯瞰用）

  CSV/JSON とも id を含むので、分析後に id をキーに UPDATE / API PATCH で書き戻せる。

.EXAMPLE
  npm run export:analysis
#>
param()

$ErrorActionPreference = 'Stop'

$Root   = Split-Path -Parent $PSScriptRoot
$Remote = 'vps'
$ts     = Get-Date -Format 'yyyyMMdd_HHmmss'
$outDir = Join-Path $Root "exports\$ts"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Push-Location $Root
try {
  Write-Host '== [1/5] ネストJSON用SQLをVPSへ転送 ==' -ForegroundColor Cyan
  scp scripts/export-nested.sql ("{0}:/tmp/ha_nested_{1}.sql" -f $Remote, $ts)
  if ($LASTEXITCODE -ne 0) { throw 'scp (sql) に失敗しました' }

  Write-Host '== [2/5] VPSで抽出（CSV + JSON）==' -ForegroundColor Cyan
  $bash = @'
set -e
TS=__TS__
D=/tmp/haexport_$TS
rm -rf "$D"; mkdir -p "$D"
EXEC="docker exec homeasset-postgres-prod psql -U homeasset -d homeasset"
for t in home_assets asset_specs asset_links consumables accessories maintenance_records repair_records network_infos categories locations; do
  $EXEC -c "COPY (SELECT * FROM $t) TO STDOUT WITH (FORMAT CSV, HEADER true)" > "$D/$t.csv"
done
$EXEC -c "COPY (SELECT h.id, h.name, h.asset_type, h.status, c.name AS category, l.name AS location, h.manufacturer, h.model_number, h.purchase_price, h.purchase_date, h.warranty_end_date, h.expected_lifespan_years, h.deleted_at, (SELECT count(*) FROM asset_specs s WHERE s.asset_id=h.id) AS specs_count, (SELECT count(*) FROM asset_links lk WHERE lk.asset_id=h.id) AS links_count, (SELECT count(*) FROM consumables co WHERE co.asset_id=h.id) AS consumables_count, (SELECT count(*) FROM accessories ac WHERE ac.asset_id=h.id) AS accessories_count FROM home_assets h LEFT JOIN categories c ON c.id=h.category_id LEFT JOIN locations l ON l.id=h.location_id ORDER BY h.created_at) TO STDOUT WITH (FORMAT CSV, HEADER true)" > "$D/_assets_overview.csv"
if command -v python3 >/dev/null 2>&1; then
  docker exec -i homeasset-postgres-prod psql -U homeasset -d homeasset -t -A < /tmp/ha_nested_$TS.sql | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin), ensure_ascii=False, indent=2))" > "$D/export.json"
else
  docker exec -i homeasset-postgres-prod psql -U homeasset -d homeasset -t -A < /tmp/ha_nested_$TS.sql > "$D/export.json"
fi
tar -czf /tmp/haexport_$TS.tgz -C "$D" .
echo "DONE_$TS"
'@
  $bash = $bash.Replace('__TS__', $ts)
  $b64  = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($bash))
  $out  = ssh $Remote "echo $b64 | base64 -d | bash -s"
  if ($LASTEXITCODE -ne 0) { throw 'VPSでの抽出に失敗しました' }
  Write-Host "  $out"

  Write-Host '== [3/5] アーカイブをダウンロード・展開 ==' -ForegroundColor Cyan
  Push-Location $outDir
  try {
    scp ("{0}:/tmp/haexport_{1}.tgz" -f $Remote, $ts) .
    if ($LASTEXITCODE -ne 0) { throw 'scp (tgz) に失敗しました' }
    tar -xzf ("haexport_{0}.tgz" -f $ts)
    Remove-Item ("haexport_{0}.tgz" -f $ts) -Force
  }
  finally { Pop-Location }

  Write-Host '== [4/5] CSVをUTF-8 BOM化（Excelの日本語文字化け防止）==' -ForegroundColor Cyan
  $readUtf8  = New-Object System.Text.UTF8Encoding($false)
  $writeBom  = New-Object System.Text.UTF8Encoding($true)
  Get-ChildItem $outDir -Filter *.csv | ForEach-Object {
    $text = [IO.File]::ReadAllText($_.FullName, $readUtf8)
    [IO.File]::WriteAllText($_.FullName, $text, $writeBom)
  }

  Write-Host '== [5/5] リモート一時ファイルを削除 ==' -ForegroundColor Cyan
  ssh $Remote ("rm -rf /tmp/haexport_{0} /tmp/haexport_{0}.tgz /tmp/ha_nested_{0}.sql" -f $ts) | Out-Null

  Write-Host ''
  Write-Host "=== 完了: $outDir ===" -ForegroundColor Green
  Get-ChildItem $outDir | Sort-Object Name | Select-Object @{N='bytes';E={$_.Length}}, Name | Format-Table -AutoSize
}
finally { Pop-Location }
