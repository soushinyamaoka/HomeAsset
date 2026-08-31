# Server Change Notice

notice_id: 20260831-HOMEASSET-001

app: HomeAsset

source_branch: main

source_commit: 0f0782dae3a5b52427353dc2645f467e7d1bc27b

impact_level: L1

status: draft

created_by: Codex

## 変更概要

HomeAsset APIのログを共通ログ規約v1に準拠した1行1JSONへ変更し、APIコンテナへ`TZ: Asia/Tokyo`を追加する。

## 変更理由

VPS管理側が全アプリのログを共通の方法で解析・監視できるようにし、ログ時刻をJSTオフセット付きで統一するため。

## server_impact判定

server_impact: notify

判定理由: ログ形式をplainな既定pino出力から共通規約準拠の構造化JSONへ変更し、APIコンテナへTZを追加する。出力先はstdoutのままで、既定リクエストログ2行を集約した1行へ減らすためL1とする。

## 現在と変更後

| 項目 | 現在 | 変更後 |
|---|---|---|
| APIログ形式 | pino既定形式 | 共通ログ規約v1準拠の1行1JSON |
| リクエストログ | Fastify既定の開始・完了ログ | `http_request`イベント1行 |
| APIコンテナTZ | 未指定 | `Asia/Tokyo` |
| ログ出力先 | stdout | stdout（変更なし） |

## 影響対象

- service/container: Docker Composeの`api`サービス
- URL/port/health: 変更なし（loopback:4001、`/health`）
- cron/timer/worker: 変更なし
- dependency: 変更なし
- data/DB/volume: 変更なし
- log/monitoring: ログパーサーは共通ログ規約v1の必須4フィールドとevent語彙を扱う

## production変更

- 必要性: あり（別途承認後のAPIコンテナ更新が必要）
- 想定作業: 承認済みの既存deploy手順によるAPIイメージ更新
- downtime: APIコンテナ入れ替え時の短時間再起動が想定される
- maintenance window: 利用者メンテナンスは不要

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
- backup対象: 変更なし
- restore確認: 本タスクでは対象外
- backward compatibility: API・DB契約に変更なし

## Deploy・rollback

- deploy前提: 本通知の受理とは別にproduction変更の明示承認が必要
- deploy手順の変更: なし。この通知はデプロイ承認ではなく、本タスクではデプロイしない
- rollback方法: 直前のアプリcommitへ戻して既存手順でAPIイメージを再構築する（別途承認が必要）
- rollback不能条件: なし（DB変更なし）

## Health・テスト

- health contract変更: なし（`GET /health`は200）
- 実施テスト: shared build、API build、実サーバによるログ自己確認
- 結果: すべて成功。ログ7行をJSON解析し、禁止キー・query付きURLがないことを確認
- 未実施テストと理由: production health確認は本経路で禁止されているため未実施

## Log・監視

- log量/形式/保存先変更: 形式を1行1JSONへ変更。保存先はstdoutのまま。既定リクエストログ2行を`http_request`1行へ集約
- event語彙: `startup`、`shutdown`、`startup_failed`、`http_request`、`request_failed`、`auth_failed`、`auth_forbidden`、`uncaught_exception`、`unhandled_rejection`、`app_log`
- 予約語の未実装: `job_start`、`job_end`、`external_call_failed`、`dependency_failed`は該当場面がないため未実装
- 新しいalert条件: `startup_failed`、`request_failed`、`uncaught_exception`、`unhandled_rejection`のerror/criticalを監視候補とする
- secret/個人情報対策: 許可フィールドのみを出力し、認証情報・個人情報・query付きURLを出力しない。redactと自己確認で検証

## 未解決事項

実機との照合とproduction反映は未実施。runtime contractの実機パス・公開URL・rollback実態はVPS管理側で確認が必要。

## 希望時期

VPS管理側の確認後。

## Approval

- app owner: 未承認
- VPS management review: 未実施
- production approval: 未承認
- related task_id: 20260831-003
