# Server Change Notice

record_type: server_change

template_type: full

policy_bundle_version: 2026-09-05.1

notice_id: 20261022-HOMEASSET-005

app: HomeAsset

source_branch: main

source_commit: 06a65b603f576b438f9197cb6f5f5a32b6951fad

production_baseline_commit: 5995aa0db0c42651d30dc7d1072de31608bd8da8

release_commits: 3c474d1a2752ba20549123f88e522683d03ff667, ffa1e9e89e84fef4a01b3eb81061ee959bf510ab, d4a8f1815a6c23f60d659d966b220c183909e8c8, 6fcf05aee30e97aa96ad15c9253f79fb15343499, 06a65b603f576b438f9197cb6f5f5a32b6951fad

impact_level: L2

status: draft

created_by: Claude（app ownerの承認による依存更新・検証・文書化、2026-10-22）

server_impact: notify

production_change: required

vps_management_handoff: required

deployment_status: not_started

user_maintenance_impact: possible

## 変更概要

notice 004のproduction反映（task 20261022-003）時に `npm ci` が出した監査警告のうち、APIのruntime依存の4件
（critical 1・high 3）を修正版へ更新する。あわせて、更新の検証で見つかった認証の弱点を1か所直す。

1. 依存の更新（`package-lock.json`、`apps/api/package.json`）
   - `fastify` 5.8.5 → 5.12.5（直接依存。`apps/api/package.json` の範囲を `^5.12.5` に変更）
   - `fast-jwt` 6.2.4 → 6.3.4（`@fastify/jwt` 10.1.0 経由。`@fastify/jwt` 自体は据え置き）
   - `fast-uri` 3.1.2 → 3.1.8、`find-my-way` 9.6.0 → 9.9.0、`process-warning` 5.0.0 → 5.1.0
   - `fastify` 5.12.5 の要求で、`fastify` 配下に `fast-json-stringify` 7.0.1 と `fast-uri` 4.2.1 が入る
2. `fastify` 5.12 で非推奨になった `disableRequestLogging` を `logController: new LogController({ disableRequestLogging: true })` に置き換え（`apps/api/src/server.ts`）
3. 認証の強化（`apps/api/src/plugins/auth.ts`）: 署名が正しくても `userId` が無い・文字列でないトークンを401にする

## 変更理由

- 監査警告の内容（GitHub Advisoryの要旨）:
  - `fast-jwt`（critical）: 期限切れトークンの受け入れ、配列ペイロードでのclaim検証のすり抜け、鍵の扱いによる署名偽造など
  - `fastify`（high）: 不正なURLでの認証すり抜け、入力・ヘッダ検証のすり抜け、HTTP/2でのDoSなど
  - `fast-uri`（high）: URL解釈のずれによるホスト取り違え・SSRF
  - `find-my-way`（high）: HTTP/2でのDoS
- 版の選び方: 修正を含み、かつ公開から2週間以上経った版にした（`npm install/update --before=2026-10-07`）。
  公開日は fastify 5.12.5 が2026-09-16、fast-jwt 6.3.4 が10-04、fast-uri 3.1.8 が09-15、find-my-way 9.9.0 が08-21、
  fast-json-stringify 7.0.1 が07-09、fast-uri 4.2.1 が09-18
- `disableRequestLogging` のままだと、`fastify` 5.12では起動時にdeprecation警告（FSTDEP023）がstderrへ出る。
  構造化ログの外に行が出て、`log:selfcheck` もNGになる
- 認証の強化: `householdMember.findFirst({ where: { userId } })` は `userId` がundefinedだと条件が無視され、任意の世帯の
  最初のメンバーとして認証されていた。こうしたトークンの作成には `JWT_SECRET` が必要なので、外部から直接は悪用できない。
  ただし、JWTライブラリの欠陥（例: 今回の配列ペイロードの件）が直接の認証すり抜けにつながる構造だったため、多層防御として直す

## release境界

production baselineはVPS管理側の正本 `production_deployments.yaml` の `5995aa0`（2026-10-22、task 20261022-003でverified）。
baselineはsource commitの祖先であることを確認済み。

baseline `5995aa0` から source commit `06a65b6` までの全commit:

| commit | 内容 | 変更ファイル | deploy artifact（`deploy.ps1` 送信対象）への影響 |
|---|---|---|---|
| `3c474d1` | notice 004の追加（docsのみ） | `ops/server-change-notices/20261022-HOMEASSET-004-summary.md` | なし（artifact対象外） |
| `ffa1e9e` | notice 004をready_for_reviewへ更新（docsのみ） | 同上 | なし（artifact対象外） |
| `d4a8f18` | 月次分析の入出力と `__pycache__/` を `.gitignore` に追加 | `.gitignore` | なし（artifact対象外） |
| `6fcf05a` | notice 004の訂正・再提出（docsのみ） | `ops/server-change-notices/20261022-HOMEASSET-004-summary.md` | なし（artifact対象外） |
| `06a65b6` | **本変更**: 依存の更新・logController・認証の強化 | `apps/api/package.json`、`apps/api/src/plugins/auth.ts`、`apps/api/src/server.ts`、`package-lock.json` | **あり**（4ファイルともbuild入力） |

baseline→sourceの差分は6ファイル（`git diff --stat 5995aa0 06a65b6`）。artifact対象は上記の4つだけで、`apps/api/Dockerfile`、
`package.json`（root）、`packages/shared`、`apps/mobile/package.json`、compose、`.dockerignore` は差分0。

### 作業ツリーと未追跡ファイル

- tracked worktreeはclean
- 未追跡の31件（`docs/monthly-*.md` 5件、`scripts/monthly-report/` 26件）は未リリースの月次レポート関連で、保持したまま本releaseに含めない。
  global gitignoreを無効にすると、これに `.claude/settings.local.json` が加わり32件になる
- `deploy.ps1` は作業ツリーをtarで固めて送る。`deploy.ps1 -DryRun`（2026-10-22、source commit後）の送信は78件で、未追跡ファイル、
  `docs/`・`scripts/`・`ops/`・`.claude/`・`local-output/`、`.env*`・`node_modules`・`dist` は含まれない

## server_impact判定

server_impact: notify

判定理由: API imageの再構築とcontainer入れ替えを伴う。runtime依存（HTTP framework・JWT検証）の更新と、認証の拒否条件の追加を含む。
port、bind、domain、TLS、health、env/secret、DB schema/data、cron/worker、log形式・event名、起動command、Node.js
（24.22.1）は変えない。永続データの値・意味は変えないためL2とする。認証の変更は「正規のトークンでは発生しない形のトークンを拒否する」
方向だけで、正規のログインで発行されたトークンの扱いは変わらない（検証で確認）。

## 現在と変更後

| 項目 | 現在（`5995aa0`） | 変更後（`06a65b6`） |
|---|---|---|
| fastify | 5.8.5 | 5.12.5 |
| fast-jwt（@fastify/jwt 10.1.0経由） | 6.2.4 | 6.3.4 |
| fast-uri / find-my-way | 3.1.2 / 9.6.0 | 3.1.8 / 9.9.0（fastify配下に fast-uri 4.2.1、fast-json-stringify 7.0.1 が追加） |
| npm ci でのpackage数 | 98 | 100 |
| npm audit（api+shared+root） | 5件（critical 1・high 3・low 1） | 1件（low: 開発用 `esbuild` のWindows開発サーバ。runtimeでは使わない） |
| `userId` が無い署名済みトークン | 200（任意の世帯に一致） | 401 |
| 配列ペイロードの署名済みトークン | 200 | 401（fast-jwtの更新による） |
| Node.js / base image / Dockerfile / compose / env | 24.22.1 / 同 | 変更なし |

## 影響対象

- service/container: Docker Composeの`api`サービス（image再構築・再起動）。`postgres`は変更しない
- URL/port/health: 変更なし。`GET /health` の200 contractを維持
- cron/timer/worker: なし
- dependency: 上記のnpmパッケージのみ
- data/DB/volume: 変更なし（migrationの追加なし）
- log/monitoring: 形式・event名は不変。不正なトークンも既存の `auth_failed`（`has_token`・`req_id`・`target`）で記録する。deprecation警告のstderr出力は無い
- mobile: 変更なし。client配信は不要（正規のトークンの扱いは不変）

## production変更

- 必要性: あり
- 想定作業: `npm run deploy` によるAPI imageの再構築と `api` containerの入れ替え（VPS管理側の計画・承認に従う）
- downtime: container入れ替え時の短時間の再起動のみ（検証では起動からhealth 200まで数秒）
- maintenance window: 不要（家族利用のみ）

## 利用者への影響

- user_maintenance_impact: possible（deploy時の短時間の再起動）
- 対象利用者・機能: 家族のみ。機能・APIの応答は不変。ログイン中のトークンもそのまま使える（再ログインは不要）
- 通知方法: 不要（app ownerが直接把握）
- client配信: 不要

## env・secret contract

- 変更: なし
- 変数名・secret種類のみ: なし（`DATABASE_URL`、`JWT_SECRET`、`NODE_ENV`、`PORT`、`TZ` を従来どおり使う）
- provisioning/rotation: 変更なし。`JWT_SECRET` のrotationも不要（漏えいの兆候はなく、今回の弱点は `JWT_SECRET` を知らないと突けない）

## Data・migration・backup

- schema/format変更: なし
- migration: なし（`apps/api/prisma` の差分0）
- backup対象: 本変更のための追加backupは不要（データを書き込む処理を変えない）。通常のdeploy前backup方針に従う
- restore確認: 該当なし
- backward compatibility: 同じDBに対して新旧のimageを交互に起動し、どちらも正常に動くことを確認した（下記テスト）

## Deploy・rollback

- deploy前提: VPS管理側の承認。deploy直前に、送信対象pathに未commitの変更がないこと（`git status`）と `deploy.ps1 -DryRun` の送信内容を確認する
- deploy手順の変更: なし
- rollback方法: image rollbackのみ。baseline `5995aa0` のsourceで再build・再起動するか、保全済みの旧API image
  （task 20261022-003でのimage）へ戻す。data rollbackは不要（migration追加なし。同じDBで旧imageが正常に動くことは検証済み）
- rollback時の注意: rollbackすると脆弱性と認証の弱点も元に戻る
- rollback不能条件: なし

## Health・テスト

- health contract変更: なし
- 実施テスト（ローカルのDocker 29.5.2、production非接続、2026-10-22）。新imageは HEAD `6fcf05a` をgit archiveしたclean sourceに
  変更4ファイルを加えたもの（commit `06a65b6` のartifact対象と同一）、旧imageは `5995aa0` のclean source。どちらもNode 24.22.1:
  - `docker build --no-cache`（新・旧）: 成功。新は `npm ci` が100 package、`prisma generate`（5.22.0）成功、npm warnなし
  - ホスト（Node 24.16.0）と新imageのbuilder stage（Node 24.22.1）: shared/apiのbuild、apiの `tsc --noEmit`、`ai-export:selfcheck`、`log:selfcheck` がOK
    - 依存更新だけの時点では `log:selfcheck` がFSTDEP023のstderr出力でNGになり、logControllerへの置き換えでOKに戻ることを確認した
    - builder stageでは、lockfileに無い `@esbuild/linux-x64`（既存の事象）を検証用containerにだけ入れて `tsx` を動かした
  - `npm ci --dry-run`（host npm 11.13.0）: 成功。mobileの `tsc --noEmit`: 成功
  - container起動とDB接続: 使い捨ての `postgres:16-alpine` に新imageを起動し、migration 3件の適用、health 200、`node -v` が v24.22.1。
    登録・ログイン、資産・子データの登録、廃棄が成功。主要GET 10件（`/api/export/ai`・`/api/export/json` を含む）がすべて200、未認証は401
  - 互換性: 同じDBで旧imageを起動して同じGET 10件を比較。時刻項目を除き10件すべて一致
  - 不正なトークン（`/api/assets` と `/api/export/ai`、新・旧で比較）:

    | トークン | 旧 | 新 |
    |---|---|---|
    | 正規（ログインで発行） | 200 | 200 |
    | 期限切れ / 期限切れでiatなし / nbfが未来 | 401 | 401 |
    | 別の鍵で署名 / ペイロード改ざん / `alg: none` / 空 | 401 | 401 |
    | 配列ペイロード（正しい鍵で署名） | **200** | 401 |
    | `userId` なし（正しい鍵で署名） | **200** | 401 |

  - 不正な形のURL14件（`//api/assets`、`/api/%61ssets`、`/%2e/api/assets`、`/api/assets%2F`、`/api/export/ai%00` など）: 新・旧で応答が
    すべて同じ。未認証で200になるものはなし（未認証は401か404。正規化されて正しいrouteに当たるものは認証付きでだけ200）
  - 停止: SIGTERMで `shutdown` を記録してexit 0（新・旧）。ログにdeprecation・warning・error levelの出力なし
  - `deploy.ps1 -DryRun`: 送信78件。上記「作業ツリーと未追跡ファイル」のとおり
  - 検証用のcontainer・network・DB・imageは削除済み
- 未実施テストと理由:
  - production環境での起動は未実施（production非接続のため）
  - HTTP/2・`trustProxy` 関連の修正は、本APIがHTTP/1.1で `trustProxy` を使っていないため、個別の再現テストはしていない

## Log・監視

- log量/形式/保存先変更: なし（不正なトークンが `auth_failed` として記録されるのは従来と同じ形式）
- 新しいalert条件: なし
- secret/個人情報対策: 変更なし。検証で使ったsecret・パスワードは使い捨てで、記録していない

## 提出前セルフチェック

正本: `C:\work\PRG\Sakura\Dev\vps-server-management\docs\templates\server_change_notice_pre_submission_checklist.md`（checklist_version 2、2026-10-22、本noticeの初回提出前）

- [x] baseline（VPS管理側の正本の `5995aa0`、sourceの祖先）からsourceまでの全commit5件とbuild入力の差分を確認した。artifact対象の差分は4ファイル
- [x] 実配布物を確認した: `deploy.ps1 -DryRun` で送信78件、secretや未追跡ファイルの混入なし。runtime contract（port・env名・起動command・health・log event）は不変
- [x] data更新なし（migrationの追加なし）。旧imageへの戻しを同じDBで検証済み。image rollbackとdata rollbackを分けて記載した
- [x] 認証の変更は正規のトークンの扱いを変えないことを、新旧比較で確認した
- [x] app owner / VPS review / production承認を分離した（下記Approval）
- [ ] source commitとnoticeのpushと、実remoteとの一致: push前（app ownerの承認待ち）。push後に確認する
- [ ] VPS管理側のread-only preflight（`-CheckActualRemote`）: push後に実行し、結果をapp owner経由で報告する

## 未解決事項

- production上での起動は未確認
- 参考（本変更とは無関係の既存事象）:
  - lockfileに `@esbuild/linux-x64` が入っていないため、Linux containerでは `tsx` 系のdev scriptが単体では動かない（runtimeは `dist` を使うため本番には影響しない）
  - `npm audit` の残り1件（low、`esbuild` のWindows開発サーバ）は開発用のみのため対象外とした

## 希望時期

critical・highの脆弱性を含むため、VPS管理側の都合がつき次第の反映を希望する。

## VPS管理チャットへの引き継ぎ

- 引き継ぎ要否: 必要
- ユーザーへの案内: 実施済み（最終回答に記載）
- VPS管理チャットへ渡すローカル絶対path: `C:\work\PRG\HomeTools\HomeAsset\HomeAsset\ops\server-change-notices\20261022-HOMEASSET-005-summary.md`

## Approval

- app owner: 依存の更新と変更通知書の作成をチャットで承認（2026-10-22）。push・production反映の承認ではない
- VPS management review: 未実施
- production approval: なし（`deployment_status: not_started`）
- related task_id: なし（チャットでの直接依頼。発端はtask 20261022-003の監査警告）
