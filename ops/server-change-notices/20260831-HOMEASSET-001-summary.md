# Server Change Notice

notice_id: 20260831-HOMEASSET-001

app: HomeAsset

source_branch: main

source_commit: 0f0782dae3a5b52427353dc2645f467e7d1bc27b

related_commits:
- 1e14d9bd35bc2eca7f580461ce6bab32e652603b（通知ファイル追加。コード変更なし）
- 1cfebce18aa5c32e45682ab2af360932b6f52253（`scripts/deploy.ps1`のヘルスチェック誤検知バグ修正。Dockerイメージのビルド対象外のため実機imageの内容には影響しない）

impact_level: L1

status: ready_for_review

production_change: required

vps_management_handoff: required

deployment_status: applied

created_by: Codex

updated_by: Claude（事後レビュー対応、2026-08-31。実施済みの事実を反映するための更新。承認状態の遡及的な書き換えは行っていない。同日、VPS管理側事後レビューの指摘反映として2回目の更新）

## 変更概要

HomeAsset APIのログを共通ログ規約v1に準拠した1行1JSONへ変更し、APIコンテナへ`TZ: Asia/Tokyo`を追加する。

## 変更理由

VPS管理側が全アプリのログを共通の方法で解析・監視できるようにし、ログ時刻をJSTオフセット付きで統一するため。

## server_impact判定

server_impact: notify

判定理由: ログ形式をplainな既定pino出力から共通規約準拠の構造化JSONへ変更し、APIコンテナへTZを追加する。出力先はstdoutのままで、既定リクエストログ2行を集約した1行へ減らすためL1とする。手順逸脱（下記）はこの技術的判定自体を変更するものではないため、impact_levelはL1のまま維持し、VPS管理側の判断に委ねる。

## 現在と変更後

| 項目 | 現在 | 変更後 |
|---|---|---|
| APIログ形式 | pino既定形式 | 共通ログ規約v1準拠の1行1JSON（一部プレーンテキスト残存。下記「Log・監視」参照） |
| リクエストログ | Fastify既定の開始・完了ログ | `http_request`イベント1行 |
| APIコンテナTZ | 未指定 | `Asia/Tokyo` |
| ログ出力先 | stdout | stdout（変更なし） |

## 手順逸脱の記録（重要）

2026-08-31、本来必要だった

```text
変更通知作成 → VPS管理側レビュー → production承認 → デプロイ
```

の順序を踏まず、**HomeAsset側チャットでのユーザー承認のみでproductionへデプロイされた**（本通知がVPS管理側のレビューを経る前）。

VPS管理側は事後にread-only確認を実施し、受理台帳へ`applied`として記録している。**この記録は事後の受理であり、デプロイ前に承認があったことを意味しない。** HomeAsset側チャットでのユーザー承認はあったが、これは所定のVPS管理フローによる事前承認ではない。両者を区別して記録する（下記「Approval」）。

再発防止のため、`work/ai_handoff/AI_INSTRUCTIONS.md`が同日付で改訂され、「production変更の計画・承認・実施・検証は原則VPS管理チャットで扱う」ことが明記された。

## VPS管理側の事後確認（read-only、2026-08-31）

- HomeAsset API・DBコンテナは稼働中
- DBコンテナはhealthy
- 既存volume `homeasset_homeasset_pgdata` を維持
- 内部・公開healthはいずれも200
- PortBindingは `127.0.0.1:4001`
- Compose projectは `homeasset`
- Compose配置先は `/home/deploy/homeasset`
- APIコンテナのworking directoryは `/app/apps/api`
- restart policyは `unless-stopped`
- Docker log driverは `json-file`
- 直近24時間のログ61行中、JSONは49行（`ts`/`app`/`level`/`event`をすべて保持）
- 非JSONログが12行残っている（原因調査結果は「Log・監視」参照）
- 明確な旧image・rollback現物は未確認
- 実機imageのbuild時刻は09:14:53 JST。実装commit `0f0782d`・通知commit `1e14d9b`より後、`scripts/deploy.ps1`のみを変更した`1cfebce`（09:25 JST頃）より前。`1cfebce`はDockerイメージのビルド対象に含まれないファイルのみの変更のため、実機imageの内容は本通知が対象とする構造化ログ機能を正しく反映している。

残っている確認事項: rollback手順の実地検証、定期backupの実施体制（backup対象であること自体はVPS管理側で確定済み。下記参照）。

**2026-08-31 VPS管理側事後レビューでの追加確定事項**（`ops/runtime-contract.yaml`へ反映済み）:

- 公開URL: `https://homeasset.homehub-tools.dedyn.io`（upstream `127.0.0.1:4001`、TLS: Let's Encrypt）。公開healthは`/health`で200
- secret_provisioning: `manual`（デプロイスクリプトが`.env`を転送・変更せず、VPS既存の`.env`を使用することを確認済み）
- DB backup要否: `backup_required: true`（HomeAsset PostgreSQLはバックアップ対象。ただし定期backupの仕組み自体は未整備）
- logging準拠表記: container全体としては完全準拠していないため`format: plain` / `schema_version: null`へ修正（アプリloggerのJSON行自体は規約準拠。非JSON行の原因は特定済み。下記「Log・監視」参照）

## 影響対象

- service/container: Docker Composeの`api`サービス（`homeasset-api-prod`）
- URL/port/health: 変更なし（loopback:4001、`/health`）。VPS管理側確認で内部・公開とも200
- cron/timer/worker: 変更なし
- dependency: 変更なし
- data/DB/volume: 変更なし（`homeasset_homeasset_pgdata`維持を確認済み）
- log/monitoring: ログパーサーは共通ログ規約v1の必須4フィールドとevent語彙を扱う。非JSON行が一部残る点は要考慮（下記）

## production変更

- 必要性: あり → **実施済み**（2026-08-31、image build 09:14:53 JST）
- 実施内容: 承認済みの既存デプロイ手順（`npm run deploy` / `scripts/deploy.ps1`）をそのまま使用し、APIコンテナのイメージを再ビルド・入れ替え
- downtime: APIコンテナ入れ替え時の短時間再起動。ヘルスチェックは復帰後200を継続的に返すことをHomeAsset側チャットとVPS管理側の双方で確認
- maintenance window: 事前の利用者メンテナンス告知なし
- **手順逸脱**: 上記「手順逸脱の記録」のとおり、VPS管理側レビュー前に実施された

## 利用者への影響

- user_maintenance_impact: none
- 対象利用者・機能: APIレスポンス契約と業務ロジックに変更なし
- 通知方法: 利用者向け通知なし

## env・secret contract

- 変更: なし
- 変数名・secret種類のみ: 新規必須環境変数なし。`LOG_LEVEL`は任意のまま
- provisioning/rotation: 変更なし

secret値は記載しない。

## Data・migration・backup

- schema/format変更: なし
- migration: なし
- backup対象: 変更なし（volume `homeasset_homeasset_pgdata`維持をVPS管理側で確認済み）。DB自体はVPS管理側判定で`backup_required: true`（バックアップ対象）。ただし**定期backupの仕組みは未整備**（下記「未解決事項」参照）
- restore確認: 本タスクでは対象外
- backward compatibility: API・DB契約に変更なし

## Deploy・rollback

- deploy前提: 本来は本通知のVPS管理側レビュー完了後に実施する想定だったが、実際にはレビュー前に実施された（上記「手順逸脱の記録」）
- deploy手順の変更: なし。承認済みの既存手順（`npm run deploy`）をそのまま使用
- rollback方法: 直前のアプリcommitへ戻して既存手順でAPIイメージを再構築することを想定しているが、**旧imageの保存・実際のrollback動作は未検証**。VPS管理側の事後確認でも「明確な旧image・rollback現物は未確認」と報告されている
- rollback不能条件: DBスキーマ変更は含まれないため、DB起因のrollback不能要因はない。ただしimage側の準備不足（旧imageが残っていない可能性）により、rollbackの実行自体が未検証

## Health・テスト

- health contract変更: なし（`GET /health`は200）
- 実施テスト:
  - 実装時（Codex）: shared build、API build、実サーバによるログ自己確認（DB非接続）
  - デプロイ後（HomeAsset側チャット）: `curl`による`/health`直接確認（200、`{"status":"ok"}`）、`docker ps`でのコンテナ稼働確認、`docker logs`での構造化ログ出力確認
  - VPS管理側事後確認（read-only）: 上記「VPS管理側の事後確認」のとおり
- 結果: 概ね良好。ただし非JSONログ12行が残存（原因調査は本reviewで実施。下記参照）
- 未実施テストと理由: rollback動作の実地検証は未実施（旧image現物がないため）

## Log・監視

- log量/形式/保存先変更: 形式を1行1JSONへ変更。保存先はstdoutのまま。既定リクエストログ2行を`http_request`1行へ集約
- event語彙: `startup`、`shutdown`、`startup_failed`、`http_request`、`request_failed`、`auth_failed`、`auth_forbidden`、`uncaught_exception`、`unhandled_rejection`、`app_log`
- 予約語の未実装: `job_start`、`job_end`、`external_call_failed`、`dependency_failed`は該当場面がないため未実装
- 新しいalert条件: `startup_failed`、`request_failed`、`uncaught_exception`、`unhandled_rejection`のerror/criticalを監視候補とする
- secret/個人情報対策: 許可フィールドのみを出力し、認証情報・個人情報・query付きURLを出力しない。redactと自己確認で検証
- **準拠表記の訂正**: `ops/runtime-contract.yaml`の`logging.format`は`structured`ではなく`plain`、`schema_version`は`1`ではなく`null`に修正した（2026-08-31、VPS管理側判定）。共通ログ規約は完全準拠していない状態を`structured`と記載しないため。アプリ`logger.ts`が出すJSON行自体は規約準拠しており、非構造化行の原因は下記のとおり特定済み。

### 非JSONログ12行の原因調査（2026-08-31、production非接続・ローカルコード調査のみ）

VPS管理側の事後確認で「直近24時間のログ61行中、非JSON12行」と報告された件を、`apps/api/Dockerfile` / `docker-compose.prod.yml` / `apps/api/package.json` のローカル調査で特定した。

**原因**: `apps/api/Dockerfile`のCMDは

```text
sh -c "npx prisma migrate deploy --schema prisma/schema.prisma && node dist/server.js"
```

であり、構造化loggerが動く`node dist/server.js`より**前**に`npx prisma migrate deploy`が実行される。このステップの出力はアプリの`logger.ts`を経由せず、コンテナのstdoutへ直接プレーンテキストで書き込まれる。内訳（コンテナ起動1回あたり）:

- Prisma CLI自身のステータス出力（`Prisma schema loaded from ...`、`Datasource "db": ...`、空行、`N migrations found in prisma/migrations`、空行、空行、`No pending migrations to apply.`）: 実際に本番コンテナの起動時ログで7行を確認
- `npx`起動に伴うnpmの自動更新通知（`npm notice`が複数行、うち1行は`New major version of npm available!`）: 実際のログで5行を確認

合計およそ12行となり、報告された非JSON12行とほぼ一致する。直近24時間のコンテナ起動が本日のデプロイ1回のみだったこととも整合する。

**改善案（今回は提案のみ。コード修正・起動command変更・再デプロイは実施していない）:**

1. `NPM_CONFIG_UPDATE_NOTIFIER=false`等の環境変数でnpmの自動更新通知を抑止する（`npm notice`分を削減）。
2. `npx prisma`ではなく`./node_modules/.bin/prisma`のように直接バイナリを呼び出す、またはPrisma CLI側に出力抑制オプションがあるか確認して適用する（確実な抑止手段かは未確認。要調査）。
3. migrate deployの出力先をアプリログと分離する（例: 明示的なプレフィックスを付けて非アプリログと判別可能にする）。
4. 対応不要と判断する場合は、コンテナ起動時のみ発生する既知の非構造化ログとしてruntime contractに明記し、監視側でこの12行前後を許容するルールを設ける。

いずれも本noticeでは未実装。対応する場合は、ログ出力の形式・量に関わる変更のため、別のserver change notice（L1想定）として提案する。

## 未解決事項

- rollback: 旧imageの保存・実際のrollback動作は未検証（VPS管理側の事後確認でも旧image現物は未確認）。
- 非JSONログ12行: 原因は特定済み（上記）。改善案は複数提示したが未実装・未承認。`ops/runtime-contract.yaml`は`format: plain` / `schema_version: null`へ修正済み（完全準拠していないことを隠さない）。
- **定期backupの実施体制が未整備**: DBは`backup_required: true`（バックアップ対象）とVPS管理側で判定されたが、定期的にbackupを取得する仕組み自体はまだ無い。体制整備は別途の検討事項とする。
- `ops/runtime-contract.yaml`の`verified_against_runtime`は引き続き`null`（今回の事後レビューで公開URL/secret provisioning/backup要否等は確定したが、全項目の網羅的な実機照合ではないため）。

**2026-08-31時点で確定済み（参考。上記「VPS管理側の事後確認」欄も参照）**: 公開URL・upstream・TLS、公開health、secret_provisioning（manual）、DB backup要否（true）。

## 希望時期

VPS管理側の事後レビュー継続後、上記未解決事項の要否判断を待つ。

## Approval

- app owner: HomeAsset側チャットで承認あり（2026-08-31、ユーザーがデプロイ実行を承認。ただし所定のVPS管理フローを経た事前承認ではない）
- VPS management review: 事後レビュー中。受理台帳へ`applied`として記録済み。**事前レビューではない**
- production approval: 所定のVPS管理フローによる事前承認なし（**遡及的に「承認済み」とはしない**）
- related task_id: 20260831-003
