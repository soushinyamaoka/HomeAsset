# 05. 非機能要件・運用・制約

## 5.1 セキュリティ

- **認証**: 全API（`/api/auth/*` を除く）は JWT（Bearer）必須。トークン有効期限 7日。シークレットは環境変数 `JWT_SECRET`（既定はdev用、本番は必ず変更）。
- **パスワード**: bcrypt（10ラウンド）でハッシュ化して保存。平文・ハッシュともレスポンスに含めない。
- **秘密情報の非保存**: パスワード・APIキー・秘密鍵・アクセストークンそのものは資産情報として保存しない。ネットワーク情報には保管場所メモ（例: "1Passwordに保存"）のみ保存する。
- **データ分離**: すべてのクエリを `req.auth.householdId` で絞り込み、家庭間のデータを分離。新規ルートは `ensureAssetInHousehold` か `where: { id, householdId }` パターンを使用。
- **CORS**: `origin: true`（MVP。本番ではオリジン制限を検討）。

## 5.2 データ整合性・論理削除

- `home_assets` は原則物理削除しない（`dispose` / `replace` で履歴を残す）。`DELETE` は誤登録専用。
- 一覧・ダッシュボードは既定で `deleted_at IS NULL` のみ対象。
- 日付は `Date`(@db.Date) ⇔ `'YYYY-MM-DD'`、金額は `Decimal(12,2)` ⇔ `number` を serialize/parse で一貫変換。
- 子テーブルは資産削除時に Cascade、`ai_import_logs` のみ SetNull。

## 5.3 パフォーマンス

- 資産一覧は最大 500 件、ダッシュボード各リストは最大 10〜30 件で `take` 制限。
- `home_assets` に `household_id` / `[household_id, status]` / `[household_id, asset_type]` / `[household_id, deleted_at]` の複合インデックス。子テーブルは `asset_id` にインデックス。
- ダッシュボードは集計クエリを `Promise.all` で並列実行。

## 5.4 起動・運用

### 環境変数（apps/api）
| 変数 | 説明 |
| --- | --- |
| DATABASE_URL | PostgreSQL 接続文字列 |
| JWT_SECRET | JWT 署名シークレット（本番必須変更） |
| PORT | API ポート（既定 4001） |
| HOST | バインドホスト（既定 `0.0.0.0`） |
| NODE_ENV | `production` でログレベル info |

`.env` はコミットしない（`.gitignore` 済み）。`.env.example` を更新したら README にも反映する。

### 開発スクリプト（ルート package.json）
| コマンド | 内容 |
| --- | --- |
| `npm run app:start` | DB(Docker) 起動 + API・Expo を別ウィンドウで一括起動 |
| `npm run app:stop` | API・Expo 停止 + DB 停止 |
| `npm run app:restart` | stop → start |
| `npm run app:status` | 各サービスの稼働状況表示 |
| `npm run db:up` / `db:down` | PostgreSQL 起動 / 停止 |
| `npm run api:dev` | API 開発サーバ（tsx watch, :4001） |
| `npm run api:migrate` / `api:seed` | Prisma マイグレーション / シード |
| `npm run mobile:start` | Expo 起動 |

> `app:*` は `scripts/app.ps1`（PowerShell）の薄いラッパ。別ウィンドウで起動した API/Expo の PID を `.run/` に記録し、stop で子プロセスごと終了する。

### 初期データ・デモアカウント
シードで `demo@example.com` / `demo1234`（家庭「デモ家庭」、owner）と初期カテゴリ・設置場所を作成。新規登録（register）でも同じ初期カテゴリ・設置場所が自動投入される。

### 実機接続
`apps/mobile/app.json` の `expo.extra.apiBaseUrl` をPCのLAN IP（例 `http://192.168.1.18:4001`）に設定し、スマホとPCを同一Wi-Fiに接続。API は `0.0.0.0` でリッスン。

## 5.5 開発時の注意（CLAUDE.md より）

- モノレポ。API・モバイル・shared のどこにまたがる変更か先に整理する。Zod/型変更は `packages/shared` 起点。
- 子テーブル（specs/links/maintenance/repairs/consumables/accessories/network_infos）は同一 CRUD パターン。1つ変更したら他も同じ変更が必要か確認する。
- 子テーブルを増やす場合は **shared schema → API route → mobile API client → mobile Form 画面 → AssetDetail 表示** の5箇所を漏れなく更新。
- Prisma schema を変更したら必ず migration を生成し commit。

## 5.6 MVP 制約（既知の未実装）

- QRコード / プッシュ通知 / OCR / ファイルアップロードは未実装（画像・書類は **URL保存のみ**）。
- AI API の直接利用は未実装（プロンプト生成＋JSON貼り付けのコピペ方式のみ）。`maintenance_suggestions` は履歴登録せずプレビューのみ。
- 端末内 SQLite オフライン同期は未実装。
- 家族の招待機能は未実装（複数ユーザー利用は手動で `household_members` に追加が必要）。ユーザーは複数家庭に所属可能だが、アプリは最古の所属家庭を主家庭として扱う。
- `npm audit` で Expo SDK 54 系の間接依存に moderate 警告。`npm audit fix --force`（expo破壊的アップグレード）は適用しない。

## 5.7 旧アプリからの移行（HomeGear → HomeAsset）

`migration_mappings`（旧ID→新ID対応表）と `migration_logs`（dry-run/execute/verify の実行ログ）で移行を管理。`npm run migrate:homegear` で実行。
