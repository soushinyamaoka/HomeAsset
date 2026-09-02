# Server Change Notice

notice_id: 20260902-HOMEASSET-002

app: HomeAsset

source_branch: main

source_commit: d11a8a9d0f04e62aa8e7d53bb50d90253bcac434

impact_level: L2

status: ready_for_review

created_by: Codex

server_impact: notify

production_change: required

vps_management_handoff: required

deployment_status: verified

user_maintenance_impact: possible

## 変更概要

コンテナ起動時（Dockerfile CMD）のPrisma CLI・npm由来の非JSONログを解消し、containerのstdout/stderrをすべて1行JSONにする。migrationの実行内容・終了コード・失敗時のサーバ起動中止は維持する。

## 変更理由

前回通知`ops/server-change-notices/20260831-HOMEASSET-001-summary.md`の「非JSONログ12行の原因調査」で特定した、アプリlogger起動前のPrisma CLI・npm出力を解消するフォローアップ対応。

## server_impact判定

server_impact: notify

判定理由: Dockerfileの起動commandとコンテナ起動時ログ形式を変更し、API imageの再構築・container入れ替えと短時間の再起動を伴うためL2とする。出力先、port、URL、health、API・DB contract、env・secret contract、依存packageは変更しない。

## 現在と変更後

| 項目 | 現在 | 変更後 |
|---|---|---|
| APIコンテナ起動command | shellからPrisma CLIとserverを順次起動 | Node entrypointがmigration後にserverを子processとして起動 |
| migrationログ | Prisma CLI・npmのプレーンテキストが混在 | `migration_start` / `migration_end`の1行JSONのみ |
| migration失敗 | serverを起動せず非0終了 | 同じ挙動を維持 |
| シグナル処理 | PID 1のshellからserverへの転送保証なし | entrypointがSIGTERM/SIGINTをserverへ転送 |
| ログ出力先 | stdout/stderr | stdout/stderr（変更なし） |

## 影響対象

- service/container: Docker Composeの`api`サービス
- URL/port/health: 変更なし。`GET /health`の200 contractを維持
- cron/timer/worker: 変更なし
- dependency: 変更なし。既存のPrisma CLIを直接使用
- data/DB/volume: schema、migration file、volume、persistent dataの変更なし。既存migration適用処理を維持
- log/monitoring: `migration_start` / `migration_end`を追加し、container全出力を1行JSONへ統一

## production変更

- 必要性: あり
- 実施結果: 2026-09-02 11:48 JST、VPS管理側が承認済みtask `20260902-002`としてAPIコンテナimageを更新
- downtime: APIコンテナ入れ替え時に短時間の再起動あり。health待機中の一時的なconnection reset後、internal/publicとも200へ復帰
- maintenance window: 妻への通知・不使用確認後に実施

新API image `sha256:1943cddd3e87de280bfe6b83d7e690e99ff8ca2c10c9197c74912f1ae4d0b354`を反映し、API/DB稼働、health、bind、DB image/volume不変、起動ログを確認した。productionの進行状態はVPS管理側受理台帳を正本とする。

## 利用者への影響

- user_maintenance_impact: possible
- 対象利用者・機能: API contractと業務機能に変更なし
- 通知方法: 妻への事前通知・不使用確認を実施済み。反映後の利用者影響は確認されていない

## env・secret contract

- 変更: なし
- 変数名・secret種類のみ: 新規追加・削除・意味変更なし
- provisioning/rotation: 変更なし

secret値は記載しない。

## Data・migration・backup

- schema/format変更: なし
- migration: 新規migrationなし。コンテナ起動時の既存`migrate deploy`を維持
- backup対象: 変更なし
- restore確認: 対象外
- backward compatibility: API・DB contractに変更なし

## Deploy・rollback

- deploy前提: VPS管理側reviewとproduction個別承認が必要
- deploy手順の変更: APIコンテナ内部のCMDのみ変更。VPS管理側がsource/imageを保全後、APIだけをbuild・入れ替え
- rollback方法: 旧sourceを`/home/deploy/backups/homeasset/20260902-002/source-before.tgz`、旧API imageを`homeasset-api:rollback-20260902-002`として保全。旧imageを`homeasset-api:latest`へ戻し、同じComposeと既存`.env`でAPIだけを再作成する手順を確定済み
- rollback不能条件: DB schema・persistent dataの変更を含まないため、本変更固有のdata rollback不能条件なし

rollback条件に該当せず、rollbackは実施していない。DB container、DB image、DB volume、`.env`は変更していない。

## Health・テスト

- health contract変更: なし
- 実施テスト:
  - shared build
  - API build
  - 既存`log:selfcheck`
  - ローカル開発用DBを使用した成功系・失敗系entrypoint検証
  - Linuxコンテナ上でのSIGTERM転送確認
- 結果: すべて成功。成功系7行・失敗系2行の全出力がJSONで、health 200、正常shutdown、migration失敗時のserver未起動と非0終了を確認
- production検証: API/DB running、internal/public health 200、bind `127.0.0.1:4001`、restart count 0、DB image/volume不変を確認
- 起動ログ検証: 8行すべてJSON、必須field欠落0、`migration_start` 1件、成功した`migration_end` 1件、`startup` 1件、critical/failure/禁止pattern 0件

## Log・監視

- log量/形式/保存先変更: 非JSONのPrisma CLI・npm出力を構造化eventへ集約。保存先はstdout/stderrのまま
- 新規event: `migration_start`、`migration_end`
- 新しいalert条件: `migration_end`かつ`status: failure`を監視候補とする
- secret/個人情報対策: migration失敗時は`prisma_error_code`のみを記録し、Prisma生出力・DB接続情報は一切記録しない。成功系・失敗系ともにローカル検証済み

## 未解決事項

- `migration_end`かつ`status: failure`の自動監視追加は、VPS管理側の段階3 collector作業で継続する
- build時の既存dependency audit結果（1 low、2 high）は今回の変更で追加されたものではなく、別途dependency管理課題として扱う

## 希望時期

2026-09-02に反映・検証済み。

## VPS管理チャットへの引き継ぎ

- 引き継ぎ要否: 必要
- ユーザーへの案内: 2026-09-02実施済み。ユーザーからVPS管理チャットへ本通知pathが引き継がれた
- VPS管理チャットへ渡すpath: `ops/server-change-notices/20260902-HOMEASSET-002-summary.md`

## Approval

- app owner: task実装を承認済み
- VPS management review: 2026-09-02受理・production検証完了
- production approval: 2026-09-02、妻への通知・不使用確認後、task `20260902-002`の即時反映をユーザーが個別承認
- related task_id: 20260902-001, 20260902-002
