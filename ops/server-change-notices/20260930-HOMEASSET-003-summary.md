# Server Change Notice

record_type: server_change

template_type: full

policy_bundle_version: 2026-09-05.1

notice_id: 20260930-HOMEASSET-003

app: HomeAsset

source_branch: main

source_commit: eb5236fd9d586fc477e5159cd21c9c6abdf5458f

production_baseline_commit: d11a8a9d0f04e62aa8e7d53bb50d90253bcac434

release_commits: baselineからsourceまで7件（下記「変更概要」）

impact_level: L2

status: draft

created_by: Claude

server_impact: notify

production_change: uncertain

vps_management_handoff: required

deployment_status: not_started

user_maintenance_impact: none

## 変更概要

production稼働中（`d11a8a9`、notice 20260902-HOMEASSET-002）以降、`main`に7件のcommitが積まれている。
**API・shared・Dockerfile・Compose・`.dockerignore`のソース差分は0件**。APIイメージのbuild入力に影響し得る差分は、
Expo SDK 54→57更新に伴うroot `package-lock.json`の変更のみ。

| commit | 内容 | build入力への影響 |
|---|---|---|
| `616a8d4` / `25f4e45` / `04ba249` | 20260902-002のnotice・runtime contract反映（docsのみ） | なし |
| `63a9c1a` | Expo SDK 54→57（`apps/mobile/app.json`・`package.json`・root `package-lock.json`） | **lockfileが変わる** |
| `74a52f7` | expo-splash-screenプラグイン設定削除（`apps/mobile/app.json`） | なし |
| `c13ccd7` / `eb5236f` | client配信の事後記録（docsのみ） | なし |

本noticeは新機能のreleaseではなく、**「次回のAPI再デプロイ時にlockfile差分が混入する」事実の申告**である。

## 変更理由

APIのDockerfileは`package.json` / `package-lock.json` / `apps/mobile/package.json`をbuild contextに含め、
`npm ci --workspace=@homeasset/shared --workspace=@homeasset/api`で依存を解決する（`scripts/deploy.ps1`の
include対象にも含まれる）。mobile側の更新であってもlockfileが変わるため、API image再構築時の依存解決結果が
baselineと変わり得ることをVPS管理側へ申告する。

## server_impact判定

server_impact: notify

判定理由: dependency/lockfileの変更がAPI imageのbuild入力に含まれる。baselineとHEADのlockfileから
`@homeasset/api` + `@homeasset/shared`の依存閉包（98 package）を機械的に比較した結果、**差分は1件のみ**:
`content-type` 2.0.0 → 2.1.0（`type-is`経由の間接依存）。API・DB・env・network・runtime・logの契約は変更しない。

## 現在と変更後

| 項目 | 現在（production） | 次回再デプロイ時 |
|---|---|---|
| API依存閉包（98 package） | baseline lockfile | `content-type`のみ 2.0.0→2.1.0 |
| APIソース / Dockerfile / Compose | `d11a8a9` | 同一（差分0） |
| 稼働中container | 変更なし | 再デプロイしない限り変更なし |

## 影響対象

- service/container: 変更なし（再デプロイまで稼働中imageは不変）
- URL/port/health: 変更なし
- cron/timer/worker: 変更なし
- dependency: 上記`content-type`の1件のみ（API image閉包）。mobile側の大規模更新（react-native等）はAPI imageに入らない
- data/DB/volume: 変更なし
- log/monitoring: 変更なし

## production変更

- 必要性: 未確定（本noticeのためのdeployは不要。VPS管理側が次回releaseへ含めるか、baseline整合をどう扱うかを判断する）
- 想定作業: なし（アプリ側からは実施しない）
- downtime: なし
- maintenance window: なし

## 利用者への影響

- user_maintenance_impact: none
- 対象利用者・機能: なし（本notice単体ではproductionに変更が入らない）
- client配信は別記録: `ops/client-releases/20260904-HOMEASSET-001-summary.md`（`record_type: client_release`、verified）。serverと前後関係なし（server_impact none）

## env・secret contract

- 変更: なし
- 変数名・secret種類のみ: なし
- provisioning/rotation: 変更なし

## Data・migration・backup

- schema/format変更: なし
- migration: 追加なし（`apps/api/prisma`差分0）
- backup対象・restore確認: 本noticeでは不要（データを変更しない）
- backward compatibility: 該当なし

## Deploy・rollback

- deploy前提: なし（`npm run deploy`は実行しない）
- deploy手順の変更: なし
- rollback方法: 未deployのため不要。将来deploy後に問題があれば`d11a8a9`のsourceで再buildする（image rollback）。データは変更しないためdata rollbackは該当なし
- rollback不能条件: なし

## Health・テスト

- health contract変更: なし
- 実施テスト（アプリ側ローカル、production非接続）:
  - `npm ci --dry-run`（api+shared+root、`--ignore-scripts`）: lockfileとworkspace manifestの整合OK
  - `npm run build`（shared・api）: 成功
  - `scripts/deploy.ps1 -DryRun`: tarball 75 entries。`.env*`・`node_modules`・鍵・個人データ・ログは含まれない（`apps/api/scripts/migration-config.json`はmapping定義のみ・追跡済み）
- 未実施テストと理由: `content-type` 2.1.0でのAPI実動作は未確認（Docker上の起動・HTTP疎通は未実施。build・型検査のみ）。

## Log・監視

- log量/形式/保存先変更: なし
- 新しいalert条件: なし
- secret/個人情報対策: 変更なし

## 提出前セルフチェック

正本: `C:\work\PRG\Sakura\Dev\vps-server-management\docs\templates\server_change_notice_pre_submission_checklist.md`（checklist_version 2、2026-09-30実施）

- [x] production baseline（`production_deployments.yaml`、`d11a8a9`、updated_at 2026-09-29）とrelease全7commit・build入力差分を確認した（`d11a8a9`は`HEAD`の祖先）
- [ ] source commitとnoticeのremote push → 下記「未解決事項」に結果を記載（push後に更新）
- [x] data更新なし（transaction・同時実行・再実行は該当なし）
- [x] image rollbackとdata rollbackを分けた（data rollback該当なし・backup/restore不要）
- [x] job/log/retention: 変更なし。runtime/dependency: lockfile差分1件を確認。client配信: 別recordで分離
- [x] app owner / VPS review / production承認 / client配信承認を分離した（下記Approval）
- [x] secret非混入（tarball・追跡fileにenv/鍵/個人データなし）、tracked working tree cleanを確認した

未確認・該当なしの理由:

- 3 Data・transaction: DB/データ変更なしのため該当なし。4 Job・ログ: cron/job/log変更なしのため該当なし。
- 5 network/public面・Dockerfile・Compose・systemd・runtime user: 差分0（`git diff d11a8a9..HEAD`で確認）。
- production baselineの`artifact_sha256` / `runtime_artifact_id`はnull（VPS側正本のまま）。稼働imageの依存が本当に2.0.0であることは実機で未確認（lockfile上の推定）。
- 稼働中の`d11a8a9`はVPS上のsource状態を**アプリ側から確認していない**（production非接続の制約。baseline正本を信頼）。

## 未解決事項

- `content-type` 2.1.0のAPI実動作は未確認（build成功のみ）。
- 本noticeの扱い（次回releaseへ同梱／baseline整合のみ／対応不要）はVPS管理側の判断。
- VPS管理側read-only preflight・実remote照合の結果: push後に追記する。

## 希望時期

急ぎではない。次回のAPI変更または再デプロイ前までにVPS管理側で扱いが決まればよい。

## VPS管理チャットへの引き継ぎ

- 引き継ぎ要否: 必要
- ユーザーへの案内: 実施済み（最終回答に記載）
- VPS管理チャットへ渡すローカル絶対path: `C:\work\PRG\HomeTools\HomeAsset\HomeAsset\ops\server-change-notices\20260930-HOMEASSET-003-summary.md`

## Approval

- app owner: 未取得（本noticeはproduction変更を求めない。承認を推測しない）
- VPS management review: 未実施
- production approval: なし（`deployment_status: not_started`）
- related task_id: なし
