# Server Change Notice

record_type: server_change

template_type: full

policy_bundle_version: 2026-09-05.1

notice_id: 20261022-HOMEASSET-005

app: HomeAsset

source_branch: main

source_commit: 5890022b3c45590f92f0b32d0c09bbd48de78f72

production_baseline_commit: 5995aa0db0c42651d30dc7d1072de31608bd8da8

release_commits: 3c474d1a2752ba20549123f88e522683d03ff667, ffa1e9e89e84fef4a01b3eb81061ee959bf510ab, d4a8f1815a6c23f60d659d966b220c183909e8c8, 6fcf05aee30e97aa96ad15c9253f79fb15343499, 06a65b603f576b438f9197cb6f5f5a32b6951fad, 32005d300dad954988b90c5a1fee1a81aa9fbeb9, 15cb97e20d60951440aa65aee2f81ad52c4e6bb4, 9beb577216cb85fddf7c91799817cc21b6612e41, 5890022b3c45590f92f0b32d0c09bbd48de78f72

impact_level: L2

status: ready_for_review

created_by: Claude（app ownerの承認による依存更新・検証・文書化、2026-10-22。同日、VPS管理レビューの指摘により再提出）

server_impact: notify

production_change: required

vps_management_handoff: required

deployment_status: not_started

user_maintenance_impact: possible

## 再提出の経緯（2026-10-22）

初回提出（notice `15cb97e`、source `06a65b6`）は、VPS管理レビュー（`docs/operations/homeasset_auth_dependency_notice_review_20261022.md`）で
blockedになった。認証ガードの変更は技術的に妥当と判断され、差し戻し理由は依存の版だけだった。

| 指摘 | 対応 |
|---|---|
| `fastify` 5.12.5 が GHSA-389g-gv7q-r4x8（影響 `>=5.12.2 <5.12.6`、2026-10-13公開）に該当し、「残る監査警告は開発用esbuildのみ」の記載と合わない | `fastify` を 5.12.7 へ更新した（`9beb577`）。レビュー記録の推奨どおり、修正版へ上げて再検証する方式（option 1） |

**原因と追加の対応:** GHSA-389g-gv7q-r4x8 はfastifyのrepository advisoryで、2026-10-22時点では `npm audit` にも
GitHubのglobal advisory DB（`/advisories?affects=`）にも出ない。初回は `npm audit` だけで確認していたため見落とした。
そこで、runtime依存88件（devを含めると101件）の各GitHub repositoryのpublished advisoryを、lockfileの版と直接照合した
（`gh api repos/<owner>/<repo>/security-advisories`、70 repository）。同じ理由で見落としていた次の該当が見つかったので、修正版へ更新した（`5890022`）:

| package | 提出時 | 更新後 | 該当していたadvisory（repository advisory） |
|---|---|---|---|
| `@fastify/jwt`（直接依存） | 10.1.0 | 10.2.5 | GHSA-j4cx-787j-xjqg（high、リクエストごとの鍵がglobal secretで上書きされる認可すり抜け）、GHSA-9x4w-r9p5-5h7m・GHSA-f5gh-84pj-v2pg（medium、特定のoption指定で有効期限が検証されない） |
| `fast-uri` | 3.1.8 | 3.1.9 | GHSA-wjr9-j795-jxcr・GHSA-w74x-v6f9-j3xg（medium、host・schemeの取り違え）、GHSA-333x-w4r6-6crp・GHSA-xhq7-xmqj-769h（low） |
| `fast-uri`（`fastify` 配下） | 4.2.1 | 4.2.3 | 同上 |
| `@fastify/proxy-addr` | 5.1.0 | 5.1.1 | GHSA-8cmm-mhw6-v7xq（critical、IPv4-mapped IPv6のtrust subnetでIP偽装） |
| `@fastify/forwarded` | 3.0.1 | 3.0.2 | GHSA-2849-m2w7-xm8f（medium、X-Forwarded-Forのtab文字） |

- 本APIはJWTを `jwtVerify()` のoption指定なしで使い、`trustProxy` も使っていないため、上記の多くは発動条件に当たらない。
  それでも修正版があるので、適用可能性の評価で残すのではなく更新した。GHSA-389g-gv7q-r4x8 も同様で、`apps/api/src` と
  `packages/shared/src` に `propertyNames` を使うschemaは無い
- 更新後の照合では、runtime依存の該当は0件。開発依存では `esbuild` 0.28.0（`tsx` 経由）だけが残る（下記「未解決事項」）

## 変更概要

notice 004のproduction反映（task 20261022-003）時に `npm ci` が出した監査警告（critical 1・high 3）と、再提出時に見つかった
repository advisoryの該当を、修正版へ更新して解消する。あわせて、更新の検証で見つかった認証の弱点を1か所直す。

1. 依存の更新（`package-lock.json`、`apps/api/package.json`）
   - `fastify` 5.8.5 → 5.12.7（直接依存。範囲を `^5.12.7` に変更）
   - `@fastify/jwt` 10.1.0 → 10.2.5（直接依存。範囲を `^10.2.5` に変更。配下に `fastify-plugin` 6.0.1 が入る）
   - `fast-jwt` 6.2.4 → 6.3.4（`@fastify/jwt` 経由）
   - `fast-uri` 3.1.2 → 3.1.9、`find-my-way` 9.6.0 → 9.9.0、`process-warning` 5.0.0 → 5.1.0、
     `@fastify/proxy-addr` 5.1.0 → 5.1.1、`@fastify/forwarded` 3.0.1 → 3.0.2
   - `fastify` 5.12 の要求で、`fastify` 配下に `fast-json-stringify` 7.0.1 と `fast-uri` 4.2.3 が入る
2. `fastify` 5.12で非推奨になった `disableRequestLogging` を `logController: new LogController({ disableRequestLogging: true })` に置き換え（`apps/api/src/server.ts`）
3. 認証の強化（`apps/api/src/plugins/auth.ts`）: 署名が正しくても `userId` が無い・空・文字列でないトークンを401にする

## 変更理由

- 監査警告とadvisoryの内容（要旨）:
  - `fast-jwt`（critical）: 期限切れトークンの受け入れ、配列ペイロードでのclaim検証のすり抜け、鍵の扱いによる署名偽造など
  - `fastify`（high）: 不正なURLでの認証すり抜け、入力・ヘッダ検証のすり抜け（GHSA-389g-gv7q-r4x8 を含む）、HTTP/2でのDoSなど
  - `@fastify/jwt`・`fast-uri`・`@fastify/proxy-addr`・`@fastify/forwarded`: 上記「再提出の経緯」の表のとおり
  - `find-my-way`（high）: HTTP/2でのDoS
- 版の選び方: 各advisoryの修正を含む最小の版にした。新しい版で中身が変わらないものは次のとおり扱った
  - `fastify` は 5.12.6 が修正版。5.12.7 は同日公開で、5.12.6 からの差分は `fastify.js` と `package.json` のバージョン表記だけなので 5.12.7 にした
  - `@fastify/forwarded` は修正版 3.0.2（2026-07-28公開）に固定した。3.1.x（2026-10-10〜21）は機能追加とその取り消し、配布ファイル構成の変更で、修正を含まない
  - `@fastify/proxy-addr` は修正版 5.1.1 に固定した。5.1.2 はCI設定の変更だけ
  - 初回提出では「公開から2週間以上」を基準にしたが、修正版の公開が新しいもの（`fastify` 5.12.6/7・`@fastify/jwt` 10.2.5・`fast-uri` 3.1.9/4.2.3、
    2026-10-13〜19）は、脆弱性を残さないことを優先した。いずれも公式repositoryのsecurity releaseで、integrityはnpm registryの値と一致する
- `disableRequestLogging` のままだと、`fastify` 5.12では起動時にdeprecation警告（FSTDEP023）がstderrへ出る。
  構造化ログの外に行が出て、`log:selfcheck` もNGになる
- 認証の強化: `householdMember.findFirst({ where: { userId } })` は `userId` がundefinedだと条件が無視され、任意の世帯の
  最初のメンバーとして認証されていた。こうしたトークンの作成には `JWT_SECRET` が必要なので、外部から直接は悪用できない。
  ただし、JWTライブラリの欠陥（例: 今回の配列ペイロードの件）が直接の認証すり抜けにつながる構造だったため、多層防御として直す

## release境界

production baselineはVPS管理側の正本 `production_deployments.yaml` の `5995aa0`（2026-10-22、task 20261022-003でverified）。
baselineはsource commitの祖先であることを確認済み。

baseline `5995aa0` から source commit `5890022` までの全commit:

| commit | 内容 | 変更ファイル | deploy artifact（`deploy.ps1` 送信対象）への影響 |
|---|---|---|---|
| `3c474d1` | notice 004の追加（docsのみ） | `ops/server-change-notices/20261022-HOMEASSET-004-summary.md` | なし（artifact対象外） |
| `ffa1e9e` | notice 004をready_for_reviewへ更新（docsのみ） | 同上 | なし（artifact対象外） |
| `d4a8f18` | 月次分析の入出力と `__pycache__/` を `.gitignore` に追加 | `.gitignore` | なし（artifact対象外） |
| `6fcf05a` | notice 004の訂正・再提出（docsのみ） | `ops/server-change-notices/20261022-HOMEASSET-004-summary.md` | なし（artifact対象外） |
| `06a65b6` | 依存の更新・logController・認証の強化（初回提出のsource） | `apps/api/package.json`、`apps/api/src/plugins/auth.ts`、`apps/api/src/server.ts`、`package-lock.json` | **あり**（4ファイルともbuild入力） |
| `32005d3` | 本noticeの追加（docsのみ） | 本notice | なし（artifact対象外） |
| `15cb97e` | 本noticeをready_for_reviewへ更新（docsのみ、初回提出） | 本notice | なし（artifact対象外） |
| `9beb577` | **再提出**: `fastify` 5.12.7 | `apps/api/package.json`、`package-lock.json` | **あり** |
| `5890022` | **再提出**: `@fastify/jwt`・`fast-uri`・`@fastify/proxy-addr`・`@fastify/forwarded` | `apps/api/package.json`、`package-lock.json` | **あり** |
| 本再提出のcommit | 本noticeの再提出（docsのみ） | 本notice | なし（artifact対象外） |

baseline→sourceの差分のうちartifact対象は4ファイル（`git diff --stat 5995aa0 5890022`: `apps/api/package.json`、`apps/api/src/plugins/auth.ts`、
`apps/api/src/server.ts`、`package-lock.json`）。`apps/api/Dockerfile`、`package.json`（root）、`packages/shared`、`apps/mobile/package.json`、
compose、`.dockerignore`、`apps/api/prisma` は差分0。初回提出からの差分（`06a65b6`→`5890022`）は `apps/api/package.json` と `package-lock.json` だけで、
ソースコードの変更は無い。

### 作業ツリーと未追跡ファイル

- tracked worktreeはclean
- 未追跡の31件（`docs/monthly-*.md` 5件、`scripts/monthly-report/` 26件）は未リリースの月次レポート関連で、保持したまま本releaseに含めない。
  global gitignoreを無効にすると、これに `.claude/settings.local.json` が加わり32件になる
- `deploy.ps1` は作業ツリーをtarで固めて送る。`deploy.ps1 -DryRun`（2026-10-22、再提出のsource commit後）の送信は78件で、未追跡ファイル、
  `docs/`・`scripts/`・`ops/`・`.claude/`・`local-output/`、`.env*`・`node_modules`・`dist` は含まれない

## server_impact判定

server_impact: notify

判定理由: API imageの再構築とcontainer入れ替えを伴う。runtime依存（HTTP framework・JWT検証）の更新と、認証の拒否条件の追加を含む。
port、bind、domain、TLS、health、env/secret、DB schema/data、cron/worker、log形式・event名、起動command、Node.js
（24.22.1）は変えない。永続データの値・意味は変えないためL2とする。認証の変更は「正規のトークンでは発生しない形のトークンを拒否する」
方向だけで、正規のログインで発行されたトークンの扱いは変わらない（検証で確認）。

## 現在と変更後

| 項目 | 現在（`5995aa0`） | 変更後（`5890022`） |
|---|---|---|
| fastify | 5.8.5 | 5.12.7 |
| @fastify/jwt / fast-jwt | 10.1.0 / 6.2.4 | 10.2.5 / 6.3.4 |
| fast-uri / find-my-way | 3.1.2 / 9.6.0 | 3.1.9 / 9.9.0（fastify配下に fast-uri 4.2.3、fast-json-stringify 7.0.1 が追加） |
| @fastify/proxy-addr / @fastify/forwarded | 5.1.0 / 3.0.1 | 5.1.1 / 3.0.2 |
| npm ci でのpackage数 | 98 | 101 |
| npm audit（api+shared+root） | 5件（critical 1・high 3・low 1） | 1件（low: 開発用 `esbuild`。下記「未解決事項」） |
| GitHub repository advisoryとの照合（runtime依存） | 該当あり | 該当0件 |
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
- 実施テスト（再提出時に、最終のsource `5890022` の内容でやり直した。ローカルのDocker、production非接続、2026-10-22）。
  新imageは `15cb97e` をgit archiveしたclean sourceに、`5890022` の `apps/api/package.json` と `package-lock.json` を加えたもの
  （`5890022` のartifact対象と同一）。旧imageは `5995aa0` のclean source。どちらもNode 24.22.1:
  - `docker build --no-cache`（新）と `docker build`（旧）: 成功。新は `npm ci` が101 package、`prisma generate` 成功、npm warnなし。
    `npm ci` の監査表示はlow 1件のみ
  - 新imageの中の版: `fastify` 5.12.7、`@fastify/jwt` 10.2.5、`fast-jwt` 6.3.4、`fast-uri` 3.1.9（fastify配下 4.2.3）、
    `@fastify/proxy-addr` 5.1.1、`@fastify/forwarded` 3.0.2
  - ホスト（Node 24.16.0）と新imageのbuilder stage（Node 24.22.1）: shared/apiのbuild、apiの `tsc --noEmit`、`ai-export:selfcheck`、`log:selfcheck` がOK
    - builder stageでは、lockfileに無い `@esbuild/linux-x64`（既存の事象）を検証用containerにだけ入れて `tsx` を動かした
    - 初回の検証で、依存更新だけの時点では `log:selfcheck` がFSTDEP023のstderr出力でNGになり、logControllerへの置き換えでOKに戻ることを確認済み
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
  - 依存の脆弱性: `npm audit`（api workspace）はlow 1件（`esbuild`）のみ。GitHub repository advisoryとの照合はruntime依存0件
  - `deploy.ps1 -DryRun`: 送信78件。上記「作業ツリーと未追跡ファイル」のとおり
  - 検証用のcontainer・network・DB・imageは削除済み
- 未実施テストと理由:
  - production環境での起動は未実施（production非接続のため）
  - HTTP/2・`trustProxy`・header schemaの `propertyNames`・`@fastify/jwt` のoption指定に関わる修正は、本APIがいずれの機能も使っていないため、
    個別の再現テストはしていない

## Log・監視

- log量/形式/保存先変更: なし（不正なトークンが `auth_failed` として記録されるのは従来と同じ形式）
- 新しいalert条件: なし
- secret/個人情報対策: 変更なし。検証で使ったsecret・パスワードは使い捨てで、記録していない

## 提出前セルフチェック

正本: `C:\work\PRG\Sakura\Dev\vps-server-management\docs\templates\server_change_notice_pre_submission_checklist.md`（checklist_version 2、2026-10-22、本noticeの初回提出前。
再提出ではレビュー記録の指摘範囲＝依存の版・監査の記載を再確認し、それに伴うbuild・runtime・release範囲を確認し直した）

- [x] baseline（VPS管理側の正本の `5995aa0`、sourceの祖先）からsourceまでの全commit9件とbuild入力の差分を確認した。artifact対象の差分は4ファイル（再提出で更新）
- [x] 実配布物を確認した: `deploy.ps1 -DryRun` で送信78件、secretや未追跡ファイルの混入なし。runtime contract（port・env名・起動command・health・log event）は不変（再提出で確認）
- [x] data更新なし（migrationの追加なし）。旧imageへの戻しを同じDBで検証済み。image rollbackとdata rollbackを分けて記載した
- [x] 認証の変更は正規のトークンの扱いを変えないことを、新旧比較で確認した（再提出で再確認）
- [x] 依存の脆弱性を `npm audit` と各GitHub repositoryのadvisoryの両方で確認した（再提出で追加）
- [x] app owner / VPS review / production承認を分離した（下記Approval）
- [ ] 再提出のcommitを `origin/main` へpushし、実remote（`git ls-remote`）とlocal HEADの一致を確認する（push前。app ownerの承認待ち）
- [ ] VPS管理側のread-only preflight（`-CheckActualRemote`、`-PreviousReviewCommit 15cb97e20d60951440aa65aee2f81ad52c4e6bb4`）: push後に実行し、結果をapp owner経由で報告する

## 未解決事項

- production上での起動は未確認
- 開発依存 `esbuild` 0.28.0（`tsx` 4.22.3 経由）の残り2件は、本変更の対象外とした:
  - GHSA-g7r4-m6w7-qqqr（low、`npm audit` に出る）: Windowsでesbuildの開発サーバを動かしたときの任意ファイル読み取り。本APIは開発サーバを使わない
  - GHSA-gv7w-rqvm-qjhr（high、repository advisory）: esbuildのDeno moduleがbinaryをintegrity検証なしで取得する件。Node版は対象外で、本APIはDenoを使わない
  - `esbuild` は `npm ci` で開発依存として入り、runtime imageの `node_modules` にも含まれるが、runtimeは `dist` を `node` で起動するため実行されない
- 参考（本変更とは無関係の既存事象）: lockfileに `@esbuild/linux-x64` が入っていないため、Linux containerでは `tsx` 系のdev scriptが単体では動かない（runtimeは `dist` を使うため本番には影響しない）

## 希望時期

critical・highの脆弱性を含むため、VPS管理側の都合がつき次第の反映を希望する。

## VPS管理チャットへの引き継ぎ

- 引き継ぎ要否: 必要
- ユーザーへの案内: 実施済み（最終回答に記載）
- VPS管理チャットへ渡すローカル絶対path: `C:\work\PRG\HomeTools\HomeAsset\HomeAsset\ops\server-change-notices\20261022-HOMEASSET-005-summary.md`

## Approval

- app owner: 依存の更新・変更通知書の作成・pushをチャットで承認（2026-10-22）。再提出のpushは別途承認を得る。production反映の承認ではない
- VPS management review: 初回（notice `15cb97e`）はblocked（依存の版と監査の記載）。本再提出で再レビューを依頼する
- production approval: なし（`deployment_status: not_started`）
- related task_id: なし（チャットでの直接依頼。発端はtask 20261022-003の監査警告）
