# Server Change Notice

record_type: server_change

template_type: full

policy_bundle_version: 2026-09-05.1

notice_id: 20261022-HOMEASSET-004

app: HomeAsset

source_branch: main

source_commit: 5995aa0db0c42651d30dc7d1072de31608bd8da8

production_baseline_commit: 242ac1b4f946af70ba645c86cd1cde8ee551b82c

release_commits: 6954c002ff37de8774c4ca4b9d7359ecf74c8c1c, a916f6b7475e655d10b71fa9779d636b98e0c97f, 5995aa0db0c42651d30dc7d1072de31608bd8da8

impact_level: L2

status: ready_for_review

previous_review_commit: ffa1e9e89e84fef4a01b3eb81061ee959bf510ab

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

production baselineはVPS管理側の正本 `production_deployments.yaml` の `242ac1b4f946af70ba645c86cd1cde8ee551b82c`
（2026-10-18のrelease recordで反映確認済み、レビュー記録の指摘による）。baselineはsource commitの祖先であることを確認済み。

baseline `242ac1b` から source commit `5995aa0` までの全commit:

| commit | 内容 | 変更ファイル | deploy artifact（`deploy.ps1` 送信対象）への影響 |
|---|---|---|---|
| `6954c00` | 003のnotice・client配信計画・README追記（docsのみ） | `ops/server-change-notices/20261018-HOMEASSET-003-summary.md`、`ops/client-releases/20261018-HOMEASSET-002-summary.md`、`README.md` | なし（artifact対象外） |
| `a916f6b` | 003のnoticeをready_for_reviewへ更新（docsのみ） | `ops/server-change-notices/20261018-HOMEASSET-003-summary.md` | なし（artifact対象外） |
| `5995aa0` | **本変更**: Node 24.22.1へのbase更新・古いoverridesの削除 | `apps/api/Dockerfile`、`package.json` | **あり**（両ファイルともbuild入力） |

baseline→sourceの差分は5ファイル（`git diff --stat 242ac1b 5995aa0`）。うちartifact対象は `apps/api/Dockerfile` と `package.json` の2つだけで、
`package-lock.json`・`packages/shared`・`apps/api` のソース・`apps/mobile/package.json`・compose・`.dockerignore` は差分0。

source commitより後のcommit（いずれもartifact対象外）:

| commit | 内容 | 変更ファイル |
|---|---|---|
| `3c474d1` | 本noticeの追加 | `ops/server-change-notices/20261022-HOMEASSET-004-summary.md` |
| `ffa1e9e` | 本noticeをready_for_reviewへ更新（前回の提出） | 同上 |
| `d4a8f18` | 月次分析の入出力（`local-input/`、`local-output/`）と `__pycache__/` を `.gitignore` に追加（実データの誤commit防止） | `.gitignore` |
| 本再提出のcommit | baseline・release範囲・preflight結果の訂正 | 本notice |

### 作業ツリーと未追跡ファイル

- tracked worktreeはclean（再提出時点）。前回の提出時に残っていた2件は次のように解消した:
  - `.gitignore`: 実データの出力先 `local-output/` が既にあるため、戻さずにcommitした（`d4a8f18`）
  - `README.md`: 未リリースの月次レポート文書へのリンクの追記だったため、`git stash` に退避した（内容は保持）
- 未追跡の31件（`docs/monthly-*.md` 5件、`scripts/monthly-report/` 26件）は、未リリースの月次レポート関連として保持しており、本releaseには含めない
- `deploy.ps1 -DryRun`（2026-10-22、tracked clean・未追跡31件ありの状態）: 送信78件で前回と同じ。未追跡ファイル、`docs/`・`scripts/`・`ops/`・
  `README.md`・`.gitignore`・`local-output/`、`.env*`・`node_modules`・`dist` は含まれない。送信対象pathは
  `package.json`、`package-lock.json`、`packages/shared`、`apps/api`、`apps/mobile/package.json`、`docker-compose.prod.yml`、`.dockerignore` だけ

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

- deploy前提: VPS管理側の承認。作業ツリーには未追跡の月次レポート関連ファイルがあるが、送信対象pathの外にあり、`deploy.ps1 -DryRun` で
  含まれないことを確認済み（上記「作業ツリーと未追跡ファイル」）。deploy直前にも `-DryRun` で送信内容を確認する
- deploy手順の変更: なし
- rollback方法: image rollbackのみ。baseline `242ac1b` のsource（Node 20 base）で再build・再起動。`242ac1b` と `a916f6b` はartifact対象ファイルが同一（間のcommitはdocsのみ）で、検証の比較に使ったNode 20 imageはこのsourceに相当する。data rollbackは不要（書き込みなし、
  migration追加なし。同じDBでNode 20 imageが正常に動くことは検証済み）
- rollback不能条件: なし

## Health・テスト

- health contract変更: なし
- 実施テスト（ローカルのDocker 29.5.2、production非接続、2026-10-22）。HEAD `a916f6b`（artifact対象ファイルはbaseline `242ac1b` と同一）を `git archive` で取り出したclean source
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

正本: `C:\work\PRG\Sakura\Dev\vps-server-management\docs\templates\server_change_notice_pre_submission_checklist.md`（checklist_version 2、2026-10-22、本noticeの初回提出前。再提出ではレビュー記録の指摘範囲＝baseline・release範囲・worktree・preflightを再確認）

- [x] baseline（VPS管理側の正本の `242ac1b`、sourceの祖先）からsourceまでの全commit3件とbuild入力差分を確認した。artifact対象の差分はDockerfile 2行とroot `package.json` のoverridesのみで、lockfileは不変（再提出で訂正）
- [x] 実配布物を確認した: `deploy.ps1 -DryRun` で送信78件、secretや未追跡ファイルの混入なし（tracked worktreeはclean、再提出で確認）。runtime contract（port・env名・起動command・health）は不変
- [x] data更新なし（migrationの追加なし）。旧imageへの戻しを同じDBで検証済み。image rollbackとdata rollbackを分けて記載した
- [x] app owner / VPS review / production承認を分離した（下記Approval）
- [x] source commit `5995aa0` とnoticeを `origin/main` へpushし（app owner承認、2026-10-22）、実remote（`git ls-remote`）とlocal HEADの一致を確認した。再提出commitもpush後に一致を確認する
- VPS管理側のread-only preflight（`tools/review_notice_preflight.ps1 -CheckActualRemote`）: 前回の提出時は未実行（このPCにPowerShell 7がない）。再提出では、この再提出commitのpush後に実行し、結果をapp owner経由で報告する

## 未解決事項

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
