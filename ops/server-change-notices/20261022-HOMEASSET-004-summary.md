# Server Change Notice

record_type: server_change

template_type: full

policy_bundle_version: 2026-09-05.1

notice_id: 20261022-HOMEASSET-004

app: HomeAsset

source_branch: main

source_commit: 5995aa0db0c42651d30dc7d1072de31608bd8da8

production_baseline_commit: a916f6b7475e655d10b71fa9779d636b98e0c97f（app owner報告による。下記「release境界」の注意を参照）

release_commits: 5995aa0 のみ

impact_level: L2

status: ready_for_review

created_by: Claude（app ownerの依頼による互換性検証と文書化、2026-10-22）

server_impact: notify

production_change: required

vps_management_handoff: required

deployment_status: not_started

user_maintenance_impact: possible

## 変更概要

Node.js 20 のEOLに伴い、API imageのbaseを `node:20-bookworm-slim` から `node:24.22.1-bookworm-slim` へ更新する。
対象はDockerfileのbuilder・runtimeの両stage。あわせて、Node 24同梱のnpm 11で `npm ci` が失敗する原因となる
root `package.json` の古い `overrides`（`expo-font` 14.0.11、Expo SDK 54時代の固定）を削除する。アプリのコード・API・DBは変更しない。

## 変更理由

- Node.js 20 がEOLとなり、セキュリティ更新が提供されないため
- `overrides` はSDK 57への更新後に不要となっていたが残っていた。lockfileは `expo-font` 57.0.3 で解決済みで、
  npm 10（Node 20）は不整合を見逃すが、npm 11.19.1（Node 24.22.1）は
  `Missing: expo-font@14.0.11 from lock file` で `npm ci` を拒否する（Docker buildで再現・確認）

## release境界

| commit | 内容 | API image build入力への影響 |
|---|---|---|
| `5995aa0` | Dockerfile 2行（FROM）・root `package.json` の `overrides` 削除 | あり |

- baselineの注意: VPS管理側の `production_deployments.yaml`（このPCのcheckout）では、homeassetの
  `deployed_source_commit` がまだ `d11a8a9`（2026-09-02）のままになっている。app ownerからは 20261018-HOMEASSET-003
  （`a916f6b`）をproductionへ反映済みと報告を受けており、未認証の確認でも `GET /api/export/ai` は404ではなく401を返す
  （2026-10-18）。**productionの実baselineが `a916f6b` であることをVPS管理側の正本で確認してほしい。**
  もし `d11a8a9` のままだと、本notice適用時に 003 のAI共有用エクスポート（`242ac1b`）も同時に入ってしまう
- 未反映の別機能（作業ツリー上の月次レポート関連の未commitファイル: `docs/monthly-*.md`、`scripts/monthly-report/`、
  `README.md`・`.gitignore` の変更）は本releaseに含めない。commitしておらず、`deploy.ps1` の送信対象path
  （`package.json`、`package-lock.json`、`packages/shared`、`apps/api`、`apps/mobile/package.json`、compose、`.dockerignore`）にも入らない

## server_impact判定

server_impact: notify

判定理由: runtimeであるNode.jsのmajor versionを更新し、API imageを再構築してcontainerを入れ替える。port、bind、domain、TLS、
health、env/secret、DB schema/data、cron/worker、log形式、起動command（`node dist/entrypoint.js`）は変わらない。
データの値・意味を変えないためL2とする。

## 現在と変更後

| 項目 | 現在 | 変更後 |
|---|---|---|
| base image（builder/runtime） | `node:20-bookworm-slim`（検証時は Node v20.20.2 / npm 10.8.2） | `node:24.22.1-bookworm-slim`（Node v24.22.1 / npm 11.19.1） |
| base image digest（検証時に取得したもの） | - | `node@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205` |
| OS / OpenSSL | Debian bookworm（`openssl` をapt導入） | 同じ |
| API依存閉包 | 98 package（`package-lock.json`） | 同じ（lockfile不変。npm 11での再生成でも差分なし） |
| Prisma | 5.22.0 | 同じ（Node 24上で `prisma generate` 成功） |
| image size（ローカル） | 約120 MB | 約130 MB |
| Compose / 起動command / env | 現状 | 変更なし |

## 影響対象

- service/container: Docker Composeの`api`サービス（image再構築・再起動）。`postgres`サービスは変更しない
- URL/port/health: 変更なし。`GET /health` の200 contractを維持
- cron/timer/worker: なし
- dependency: Node.js runtime 20→24.22.1。npmパッケージは不変
- data/DB/volume: 変更なし（migrationの追加なし。起動時の `prisma migrate deploy` は従来どおり）
- log/monitoring: 形式・event不変（検証で `startup` / `migration_start` / `migration_end` / `http_request` / `auth_failed` / `shutdown` を確認）
- mobile: root `package.json` の変更はmobileの解決結果を変えない（lockfile不変、`expo-font` は57.0.3のまま）。client配信は不要

## production変更

- 必要性: あり
- 想定作業: `npm run deploy` によるAPI imageの再構築（Node 24 baseのpullを含む）と `api` containerの入れ替え（VPS管理側の計画・承認に従う）
- downtime: container入れ替え時の短時間の再起動のみ（従来のdeployと同等。検証では起動からhealth 200まで約1〜2秒）
- maintenance window: 不要（家族利用のみ）

## 利用者への影響

- user_maintenance_impact: possible（deploy時の短時間の再起動）
- 対象利用者・機能: 家族のみ。機能・APIの応答は不変
- 通知方法: 不要（app ownerが直接把握）
- client配信: 不要

## env・secret contract

- 変更: なし
- 変数名・secret種類のみ: なし（`DATABASE_URL`、`JWT_SECRET`、`NODE_ENV`、`PORT`、`TZ` を従来どおり使う）
- provisioning/rotation: 変更なし

## Data・migration・backup

- schema/format変更: なし
- migration: なし（`apps/api/prisma` の差分0）
- backup対象: 本変更のための追加backupは不要（データを書き込まない）。通常のdeploy前backup方針に従う
- restore確認: 該当なし
- backward compatibility: 同じDBに対してNode 24 imageとNode 20 imageを交互に起動し、どちらも正常に動くことを確認した（下記テスト）

## Deploy・rollback

- deploy前提: VPS管理側の承認。作業ツリーに未commitファイルがあるため、deployは `5995aa0` のclean checkoutから行うか、
  送信対象pathに未commitの変更がないこと（`deploy.ps1 -DryRun`）を確認してから行う
- deploy手順の変更: なし
- rollback方法: image rollbackのみ。`a916f6b` のsource（Node 20 base）で再build・再起動。data rollbackは不要（書き込みなし、
  migration追加なし。同じDBでNode 20 imageが正常に動くことは検証済み）
- rollback不能条件: なし

## Health・テスト

- health contract変更: なし
- 実施テスト（ローカルのDocker 29.5.2、production非接続、2026-10-22）。HEAD `a916f6b` を `git archive` で取り出したclean source
  にDockerfileの変更とoverridesの削除を加えたもので検証した。commit `5995aa0` のtreeと一致することも確認済み:
  - `docker build --no-cache`（Node 24、builder/runtime両stage）: 成功。`npm ci` は98 package、`prisma generate`
    （Prisma Client 5.22.0）は成功。npm warn・EBADENGINEはなし
  - 比較用に、変更前のDockerfile（Node 20）でも `docker build --no-cache` が成功することを確認
  - 修正前（overridesあり）のNode 24 build: `npm ci` が `Missing: expo-font@14.0.11 from lock file` で失敗（原因の特定）
  - builder stage（Node 24.22.1）で `tsc --noEmit`（api）が成功。`ai-export:selfcheck` と `log:selfcheck` もOK（Node 20でも同結果）
  - container起動とDB接続: 使い捨ての `postgres:16-alpine`（匿名volume、検証後に削除）に対してNode 24 imageを起動した
    - migration 3件を適用し、health 200
    - 登録・ログイン、資産2件の作成、spec・点検記録・ネットワーク情報・アクション計画の登録、廃棄が成功
    - `/api/auth/me`、`/api/assets`（`includeDisposed` あり・なし）、`/api/assets/:id`、`/api/dashboard`、`/api/action-plans`、
      `/api/export/ai`（`includeNetwork` あり・なし）、`/api/export/json` がすべて200。未認証は401
  - 互換性: 同じDBでNode 20 imageを起動し、同じ10件のGETを比較した。時刻項目を除き、レスポンスは10件すべて一致。
    Node 20側の起動ではpending migrationはなかった
  - 停止: SIGTERMで `shutdown` を記録してexit 0（Node 24・20とも）。ログにdeprecation・warning・error levelの出力なし
  - `npm ci --dry-run`（host npm 11.13.0、api+shared+root）: 成功。mobileの `tsc --noEmit`: 成功、`expo-font` は57.0.3のまま
  - `deploy.ps1 -DryRun`: 送信78件。`.env*`・鍵・`node_modules`・`dist`・月次レポート関連のファイルなし
- 未実施テストと理由:
  - production環境（VPSのDocker・既存DB volume）での起動は未実施（production非接続の指示のため）
  - 既存のproduction DBのデータ量・内容での動作は未確認（ローカルでは使い捨てDBと最小データで確認）

## Log・監視

- log量/形式/保存先変更: なし
- 新しいalert条件: なし
- secret/個人情報対策: 変更なし

## 提出前セルフチェック

正本: `C:\work\PRG\Sakura\Dev\vps-server-management\docs\templates\server_change_notice_pre_submission_checklist.md`（checklist_version 2、2026-10-22、本noticeの初回提出前）

- [x] baselineとrelease commit・build入力差分を確認した。差分はDockerfile 2行とroot `package.json` のoverridesのみで、lockfileは不変（baselineの正本との食い違いは上記「release境界」に記載）
- [x] 実配布物を確認した: `deploy.ps1 -DryRun` で送信78件、secretや未commitファイルの混入なし。runtime contract（port・env名・起動command・health）は不変
- [x] data更新なし（migrationの追加なし）。旧imageへの戻しを同じDBで検証済み。image rollbackとdata rollbackを分けて記載した
- [x] app owner / VPS review / production承認を分離した（下記Approval）
- [x] source commit `5995aa0` とnotice本体（`3c474d1`）を `origin/main` へpushし（app owner承認、2026-10-22）、実remote（`git ls-remote`）とlocal HEADの一致を確認した。ready_for_reviewへの更新commitも別途pushして一致を確認する
- VPS管理側のread-only preflight（`tools/review_notice_preflight.ps1`）は**未実行**: このPCにPowerShell 7（`pwsh`）がないため

## 未解決事項

- productionの実baselineの確認（`production_deployments.yaml` が `d11a8a9` のまま。上記）
- production上での起動とDB接続は未確認
- 参考（本変更とは無関係の既存事象）:
  - lockfileに `@esbuild/linux-x64` が入っていないため、Linux containerでは `tsx` 系のdev scriptが単体では動かない（Node 20でも同じ。runtimeは `dist` を使うため本番には影響しない）
  - `includeNetwork` に不正な値を渡しても400にならず200を返す（Node 20でも同じ）

## 希望時期

Node.js 20 がEOLのため、VPS管理側の都合がつき次第の反映を希望する。

## VPS管理チャットへの引き継ぎ

- 引き継ぎ要否: 必要
- ユーザーへの案内: 実施済み（最終回答に記載）
- VPS管理チャットへ渡すローカル絶対path: `C:\work\PRG\HomeTools\HomeAsset\HomeAsset\ops\server-change-notices\20261022-HOMEASSET-004-summary.md`

## Approval

- app owner: Node 24への互換性検証と変更通知書の作成を依頼し、pushをチャットで承認（2026-10-22）。production反映の承認ではない
- VPS management review: 未実施
- production approval: なし（`deployment_status: not_started`）
- related task_id: なし（チャットでの直接依頼）
