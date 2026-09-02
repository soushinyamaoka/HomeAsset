# Server Change Notice

notice_id: 20260902-HOMEASSET-002

app: HomeAsset

source_branch: main

source_commit: d11a8a9d0f04e62aa8e7d53bb50d90253bcac434

impact_level: L1

status: draft

created_by: Codex

server_impact: notify

production_change: required

vps_management_handoff: required

deployment_status: not_started

user_maintenance_impact: none

## 変更概要

コンテナ起動時（Dockerfile CMD）のPrisma CLI・npm由来の非JSONログを解消し、containerのstdout/stderrをすべて1行JSONにする。migrationの実行内容・終了コード・失敗時のサーバ起動中止は維持する。

## 変更理由

前回通知`ops/server-change-notices/20260831-HOMEASSET-001-summary.md`の「非JSONログ12行の原因調査」で特定した、アプリlogger起動前のPrisma CLI・npm出力を解消するフォローアップ対応。

## server_impact判定

server_impact: notify

判定理由: Dockerfileの起動commandとコンテナ起動時ログ形式を変更し、アプリ固有eventを2件追加する。出力先、port、URL、health、API・DB contract、env・secret contract、依存packageは変更しないためL1とする。

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
- 想定作業: VPS管理側でreviewとproduction承認を得た後、APIコンテナimageを更新
- downtime: APIコンテナ入れ替え時の短時間再起動の可能性あり
- maintenance window: 利用者向けmaintenanceは不要

`production_change: required`のため、`deployment_status: not_started`のままVPS管理側へ引き継ぐ。本通知はデプロイ承認ではなく、本タスクではVPSへの接続・確認・デプロイを一切行わない。

## 利用者への影響

- user_maintenance_impact: none
- 対象利用者・機能: API contractと業務機能に変更なし
- 通知方法: 利用者向け通知なし

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
- deploy手順の変更: APIコンテナ内部のCMDのみ変更。production作業は本タスクで未実施
- rollback方法: 実装commitの直前commitへ戻したAPI imageを再構築する想定。productionでの実施はVPS管理側の判断対象
- rollback不能条件: DB schema・persistent dataの変更を含まないため、本変更固有のdata rollback不能条件なし

本通知はデプロイ承認ではなく、本タスクではVPSへの接続・デプロイを一切行わない。`deployment_status`は`not_started`のままとする。

## Health・テスト

- health contract変更: なし
- 実施テスト:
  - shared build
  - API build
  - 既存`log:selfcheck`
  - ローカル開発用DBを使用した成功系・失敗系entrypoint検証
  - Linuxコンテナ上でのSIGTERM転送確認
- 結果: すべて成功。成功系7行・失敗系2行の全出力がJSONで、health 200、正常shutdown、migration失敗時のserver未起動と非0終了を確認
- 未実施テストと理由: production検証は未承認かつ本経路で禁止されているため未実施

## Log・監視

- log量/形式/保存先変更: 非JSONのPrisma CLI・npm出力を構造化eventへ集約。保存先はstdout/stderrのまま
- 新規event: `migration_start`、`migration_end`
- 新しいalert条件: `migration_end`かつ`status: failure`を監視候補とする
- secret/個人情報対策: migration失敗時は`prisma_error_code`のみを記録し、Prisma生出力・DB接続情報は一切記録しない。成功系・失敗系ともにローカル検証済み

## 未解決事項

- VPS管理側review、production承認、production反映、反映後のログ確認は未実施

## 希望時期

VPS管理側reviewとproduction個別承認後。

## VPS管理チャットへの引き継ぎ

- 引き継ぎ要否: 必要
- ユーザーへの案内: 未実施（非対話実行経路のため、resultの引き継ぎfieldのみ記録）
- VPS管理チャットへ渡すpath: `ops/server-change-notices/20260902-HOMEASSET-002-summary.md`

## Approval

- app owner: task実装を承認済み
- VPS management review: 未実施
- production approval: 未承認
- related task_id: 20260902-001
