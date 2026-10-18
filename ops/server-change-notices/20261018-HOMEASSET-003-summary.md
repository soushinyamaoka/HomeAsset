# Server Change Notice

record_type: server_change

template_type: full

policy_bundle_version: 2026-09-05.1

notice_id: 20261018-HOMEASSET-003

app: HomeAsset

source_branch: main

source_commit: 242ac1b4f946af70ba645c86cd1cde8ee551b82c

production_baseline_commit: d11a8a9d0f04e62aa8e7d53bb50d90253bcac434

release_commits: 下記「release境界」の全commit（baseline以降の未反映分をすべて含む）

impact_level: L2

status: ready_for_review

created_by: Claude（実装はCodex task 20261018-001/002、最終修正・検証・文書化はClaude）

server_impact: notify

production_change: required

vps_management_handoff: required

deployment_status: not_started

user_maintenance_impact: possible

## 変更概要

登録済みの全資産を、他のAI（ChatGPT等）へ渡すための整理済みJSONとして返す読み取り専用API
`GET /api/export/ai?includeNetwork=true|false` を追加する。mobileのエクスポート画面から
ファイル共有・クリップボードコピーで使う。既存のバックアップ用 `GET /api/export/json` は変更しない。

## 変更理由

家庭の資産情報を外部AIへ渡して管理・助言してもらいたいというapp ownerの要望。既存のJSONは内部ID・
タイムスタンプ・重複が多く、enum値の説明も無いためAI向けに不向きだった。

## release境界

baseline `d11a8a9`（`production_deployments.yaml`、2026-09-02 verified）から本source commitまでの全commit:

| commit | 内容 | API image build入力への影響 |
|---|---|---|
| `616a8d4` / `25f4e45` / `04ba249` | 20260902-002 notice・runtime contractの反映（docsのみ） | なし |
| `63a9c1a` | Expo SDK 54→57（mobile manifest・root lockfile） | lockfileのみ |
| `74a52f7` | expo-splash-screen設定削除（`apps/mobile/app.json`） | なし |
| `c13ccd7` / `eb5236f` | client配信の事後記録（docsのみ） | なし |
| `5f16dee` / `2905210` / `cfa1686` / `e2fa007` | 誤って作成したnoticeの追加とrevert（差し引き変更なし） | なし |
| `242ac1b` | **本変更**: AI共有用エクスポート（shared・API・mobile・lockfile） | あり |

本notice追加のdocs commitは別途（下記「提出前セルフチェック」に記録）。

## server_impact判定

server_impact: notify

判定理由: 認証必須の読み取り専用APIを1本追加しAPI imageの再構築・container入れ替えを伴う。port、bind、domain、
TLS、health、env/secret、DB schema/data、cron/worker、log形式、起動commandは不変。認証・権限の仕組みも
変えない（既存の認証必須スコープ内に追加）。データの値・意味を変えないためL3ではなくL2とする。

## 現在と変更後

| 項目 | 現在 | 変更後 |
|---|---|---|
| API endpoint | `GET /api/export/json`等 | `GET /api/export/ai` を追加（認証必須・household絞り込み） |
| API依存閉包（98 package） | baseline lockfile | `content-type` 2.0.0→2.1.0 のみ（SDK57更新由来。本変更による増減なし） |
| Dockerfile / Compose / 起動command | `d11a8a9` | 変更なし |
| DB | 変更なし | 変更なし（読み取りのみ） |

## 影響対象

- service/container: Docker Composeの`api`サービス（image再構築・再起動）
- URL/port/health: 変更なし。`GET /health`の200 contractを維持
- cron/timer/worker: なし
- dependency: API側は上記`content-type`のみ。mobile側に`expo-sharing` / `expo-file-system`を追加（API imageには入らない）
- data/DB/volume: 変更なし
- log/monitoring: 形式・event不変。新endpointも既存の`http_request`で記録され、query文字列は`requestLogTarget`で除去される

## production変更

- 必要性: あり
- 想定作業: `npm run deploy`によるAPI image再構築と`api`container入れ替え（VPS管理側の計画・承認に従う）
- downtime: container入れ替え時の短時間の再起動のみ（従来のdeployと同等）
- maintenance window: 不要（家族利用のみ）

## 利用者への影響

- user_maintenance_impact: possible（deploy時の短時間の再起動）
- 対象利用者・機能: 家族のみ。新機能はclient配信後に利用可能。既存機能は不変
- 通知方法: 不要（app ownerが直接把握）
- client配信: 別記録 `ops/client-releases/20261018-HOMEASSET-002-summary.md`。**API反映（applied以降）後に配信する**。
  旧clientは新endpointを呼ばないため互換。新clientが旧APIに当たると404となり画面にエラー表示されるだけ（データ影響なし）

## env・secret contract

- 変更: なし
- 変数名・secret種類のみ: なし
- provisioning/rotation: 変更なし

## Data・migration・backup

- schema/format変更: なし
- migration: なし（`apps/api/prisma`差分0）
- backup対象: 本変更のための追加backupは不要（データを書き込まない）
- restore確認: 該当なし
- backward compatibility: 既存APIのレスポンスは不変

## Deploy・rollback

- deploy前提: VPS管理側の承認
- deploy手順の変更: なし
- rollback方法: image rollbackのみ。baseline `d11a8a9`のsourceで再build・再起動。data rollbackは不要（書き込みなし）
- rollback不能条件: なし。ただしclient配信後にAPIをrollbackすると、新clientのAI共有機能だけが404になる（他機能は影響なし）

## Health・テスト

- health contract変更: なし
- 実施テスト（アプリ側ローカル、production非接続、2026-10-18）:
  - `npm run build --workspace=@homeasset/shared` / `--workspace=@homeasset/api`: 成功
  - `npm run ai-export:selfcheck --workspace=@homeasset/api`（DB不要のfixture）: OK。ネットワーク情報の除外・
    内部ID/タイムスタンプ非混入・空値省略・日付/Decimal変換・延長保証・資産IDの先頭配置・件数集計を検査
  - `npm run log:selfcheck --workspace=@homeasset/api`: OK（ログ形式の回帰なし）
  - `npx tsc --noEmit -p apps/mobile/tsconfig.json`: 成功
  - `npx expo-doctor`: 19/21。失敗2件は既存（`@expo/config-plugins`直接依存、既存パッケージのパッチ版遅れ）で本変更による増加なし
  - `npm ci --dry-run`（api+shared+root）: lockfileとworkspace manifestの整合OK
- 未実施テストと理由: 実DB・実HTTPでの`/api/export/ai`疎通、Docker image上の起動は未実施（ローカルDBを起動していないため）。
  Codex sandboxでは`tsx`が`uv_os_get_passwd ENOMEM`で起動できず、selfcheckはClaudeがローカルで実行した

## Log・監視

- log量/形式/保存先変更: なし（1リクエスト1行の`http_request`が増えるだけ）
- 新しいalert条件: なし
- secret/個人情報対策: レスポンス本文はログに出さない。ネットワーク情報（IP・MAC・管理URL）は既定でレスポンスからも除外

## 提出前セルフチェック

正本: `C:\work\PRG\Sakura\Dev\vps-server-management\docs\templates\server_change_notice_pre_submission_checklist.md`（checklist_version 2、2026-10-18実施。このアプリでの初回実施）

- [x] production baseline（`d11a8a9`、HEADの祖先）とrelease全commit・build入力差分を確認した。API依存閉包の差分は`content-type`1件
- [x] source commit `242ac1b`とnotice本体（`6954c00`）を`origin/main`へpushし、実remote（`git ls-remote`）とlocal HEADの一致を確認した。ready_for_reviewへの更新commitは別途pushし一致を確認する
- [x] data更新なし（読み取り専用GET。transaction・同時実行・途中失敗・再実行は該当なし。何度呼んでも同じ結果）
- [x] image rollbackとdata rollbackを分けた（data rollback該当なし、backup/restore不要）
- [x] job/log/retention: 変更なし。runtime/dependency: Dockerfile・Compose差分0、lockfile整合確認済み。client配信: 別recordで分離
- [x] app owner / VPS review / production承認 / client配信承認を分離した（下記Approval）
- [x] secret非混入: `deploy.ps1 -DryRun`の配布物78件に`.env*`・鍵・個人データ・`node_modules`・`dist`なし。commit差分にsecretパターンなし

未確認・該当なしの理由:

- 空欄: null・空文字・空配列はキーごと省略（selfcheckで検査）。旧版互換: 既存APIは不変、新旧clientの組み合わせは「利用者への影響」に記載
- 4 Job・ログ: cron/job追加なしのため該当なし
- VPS管理側read-only preflight（`tools/review_notice_preflight.ps1`）は**未実行**: PowerShell 7（`pwsh`）が無く、
  Windows PowerShell 5.1では実行できない（scriptは編集していない）。代替として上記の手動確認を実施
- 稼働中imageの実際の依存versionは未確認（production非接続。baseline正本とlockfileからの推定）

## 未解決事項

- 実DB・実HTTPでの疎通確認は未実施（上記）
- preflight未実行（上記）

## 希望時期

急ぎではない。VPS管理側の都合のよいタイミングでよい。

## VPS管理チャットへの引き継ぎ

- 引き継ぎ要否: 必要
- ユーザーへの案内: 実施済み（最終回答に記載）
- VPS管理チャットへ渡すローカル絶対path: `C:\work\PRG\HomeTools\HomeAsset\HomeAsset\ops\server-change-notices\20261018-HOMEASSET-003-summary.md`

## Approval

- app owner: 機能の実装・commit・pushをチャットで承認（2026-10-18）。production反映の承認ではない
- VPS management review: 未実施
- production approval: なし（`deployment_status: not_started`）
- related task_id: 20261018-001, 20261018-002
