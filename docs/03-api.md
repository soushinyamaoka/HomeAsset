# 03. API 仕様

REST API（Fastify 5）。出典: `apps/api/src/routes/`、`apps/api/src/server.ts`、`packages/shared/src/schemas/`。

## 3.1 共通仕様

- **ベースURL**: `http://localhost:4001`
- **ヘルスチェック**: `GET /health` → `{ "status": "ok" }`（認証不要）
- **認証**: JWT（Bearer）。`POST /api/auth/*` 以外は認証必須。
- **CORS**: `origin: true`（全オリジン許可）。
- **JSONボディ**: 空ボディは `{}` として扱う（独自パーサ）。
- **日付**: リクエスト/レスポンスとも `'YYYY-MM-DD'` 文字列。金額（Decimal）はレスポンスで `number`。

### 認証ヘッダ
```
Authorization: Bearer <token>
```
JWT ペイロードは `{ userId }`、有効期限 7日（`expiresIn: '7d'`）。シークレットは環境変数 `JWT_SECRET`。

認証ミドルウェア（`plugins/auth.ts`）は JWT 検証後、その `userId` の最古の `household_member` を引き、`req.auth = { userId, householdId, role }` をセットします。所属家庭がなければ 403。

### エラー形式
| ステータス | 意味 | ボディ例 |
| --- | --- | --- |
| 400 | バリデーション失敗 | `{ "message": "...", "errors": { ...zod flatten } }` |
| 401 | 未認証 / 認証失敗 | `{ "message": "認証が必要です" }` |
| 403 | 所属家庭なし | `{ "message": "所属している家庭が見つかりません" }` |
| 404 | リソースなし | `{ "message": "資産が見つかりません" }` |
| 409 | 重複（メール登録済） | `{ "message": "..." }` |

バリデーションは `packages/shared` の Zod スキーマを `utils/validate.ts` の `parseBody` 経由で適用します。

## 3.2 認証（/api/auth・認証不要）

### POST /api/auth/register
ユーザーと家庭を同時作成し、owner として紐づけ、初期カテゴリ・設置場所を投入。JWTを返す。

リクエスト（`registerSchema`）:
```json
{ "email": "a@example.com", "password": "8文字以上", "name": "氏名", "householdName": "（任意）" }
```
`householdName` 省略時は `"{name}の家"`。レスポンス 201:
```json
{ "token": "...", "user": { "id","email","name","householdId","householdName","role" } }
```

### POST /api/auth/login
リクエスト（`loginSchema`）: `{ "email", "password" }`。成功で register と同形の `{ token, user }`。認証失敗 401。

### POST /api/auth/logout
`{ "ok": true }` を返すだけ（JWTはクライアント側で破棄）。

### GET /api/auth/me（認証必須）
現在のユーザー・家庭情報 `{ user: {...} }` を返す。

## 3.3 家庭（/api/households・認証必須）

| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | `/api/households/current` | 自家庭情報 |
| GET | `/api/households/current/members` | メンバー一覧（id, userId, email, name, role） |

## 3.4 資産（/api/assets・認証必須）

### GET /api/assets — 一覧
クエリ（`assetListQuerySchema`）:

| パラメータ | 値 | 説明 |
| --- | --- | --- |
| search | string | name/manufacturer/modelNumber/serialNumber/contractorName/memo を部分一致（大文字小文字無視） |
| assetType | ASSET_TYPES | 種別フィルタ |
| categoryId / locationId | string | カテゴリ・設置場所フィルタ |
| status | ASSET_STATUSES | ステータスフィルタ |
| warrantyFilter | `expiring_soon` / `expired` / `none` | 保証期限フィルタ（30日以内/期限切れ/保証なし） |
| sort | created_desc / updated_desc / name_asc / warranty_asc / purchase_desc / installed_desc / construction_desc / next_maintenance_asc | 並び順（既定 updated_desc） |
| includeDisposed | bool | 廃棄済みを含める（既定 false） |

`category`・`location` を含めて最大 500 件返す。`next_maintenance_asc` は次回メンテ予定日でアプリ側ソート。

### GET /api/assets/:id — 詳細
資産本体に加え、`category`, `location`, `specs`, `links`, `maintenanceRecords`, `repairRecords`, `consumables`, `accessories`, `networkInfo` を全て含めて返す。他家庭のIDは 404。

### POST /api/assets — 新規作成（`assetInputSchema`）
必須は `name` のみ。`assetType`（既定 device）/ `status`（既定 active）/ `priority`（既定 medium）。日付は `YYYY-MM-DD`、URL系は URL 形式チェック、金額・年数は 0 以上。`warrantyEndDate >= warrantyStartDate` を相関チェック。成功 201。

### PUT /api/assets/:id — 更新
`assetInputSchema` で全項目を置き換え（未指定項目は null クリア）。他家庭は 404。

### DELETE /api/assets/:id — 物理削除（誤登録専用）
成功 204。通常は次の dispose/replace を使う。

### POST /api/assets/:id/dispose — 廃棄（論理削除）
`status=disposed` + `deleted_at` をセット。一覧から既定で除外される。

### POST /api/assets/:id/replace — 交換済み
`status=replaced` に変更（履歴として残す）。

## 3.5 子テーブル CRUD（共通パターン・認証必須）

各子テーブルは同一パターン。`:id` は資産ID、`:childId` は子レコードID。一覧/作成は資産配下、更新/削除はリソース単位。作成は 201、削除は 204。すべて `householdId` で保護（`ensureAssetInHousehold` または `where: { id, householdId }`）。

| 子テーブル | 一覧/作成 | 更新/削除 | 入力スキーマ |
| --- | --- | --- | --- |
| 仕様 | `GET/POST /api/assets/:id/specs` | `PUT/DELETE /api/asset-specs/:childId` | `specInputSchema` |
| リンク | `GET/POST /api/assets/:id/links` | `PUT/DELETE /api/asset-links/:childId` | `linkInputSchema` |
| メンテ | `GET/POST /api/assets/:id/maintenance-records` | `PUT/DELETE /api/maintenance-records/:childId` | `maintenanceInputSchema` |
| 修理 | `GET/POST /api/assets/:id/repair-records` | `PUT/DELETE /api/repair-records/:childId` | `repairInputSchema` |
| 消耗品 | `GET/POST /api/assets/:id/consumables` | `PUT/DELETE /api/consumables/:childId` | `consumableInputSchema` |
| 付属品 | `GET/POST /api/assets/:id/accessories` | `PUT/DELETE /api/accessories/:childId` | `accessoryInputSchema` |
| ネットワーク | `GET/POST /api/assets/:id/network-info` | `PUT/DELETE /api/network-infos/:childId` | `networkInfoInputSchema`（資産1件に1件） |

### 主なバリデーション例
- **maintenance**: `maintenanceDate` 必須（YYYY-MM-DD）、`maintenanceType` 既定 inspection、`nextDueDate >= maintenanceDate` を相関チェック。
- **network**: `port` は 0〜65535、`connectionType` は CONNECTION_TYPES、秘密情報は `credentialStorageMemo`（保管場所メモ）のみ。

## 3.6 AI取り込み（/api・認証必須）

### POST /api/ai-import/parse
AI回答の生JSON文字列をパース・検証してプレビュー用に返す。
リクエスト: `{ "rawJson": "<JSON文字列>", "assetId": "（任意・既存資産）" }`。
- JSON parse 失敗 → 400、構造不正（`aiImportPayloadSchema`）→ 400。
- レスポンス: `{ payload, existingAsset }`。

### POST /api/assets/:id/ai-import/apply
既存資産にAI回答を反映（`aiImportApplySchema`）。
```json
{ "payload": {...}, "overwrite": false,
  "applySpecs": true, "applyLinks": true, "applyConsumables": true, "applyAccessories": true }
```
- **`overwrite=false`（既定）**: 資産本体は空欄項目のみ反映。`summary` は memo へ（既存があれば追記）。
- **specs/links/consumables/accessories**: それぞれ spec_name / url / name で重複判定し、重複しないものだけ追加。
- `maintenance_suggestions` は反映せず（プレビューのみ）。
- レスポンス: `{ ok: true, counts: { assetFieldsUpdated, specsCreated, linksCreated, consumablesCreated, accessoriesCreated } }`。`ai_import_logs` に記録。

### POST /api/ai-import/create-and-apply
新規資産を作成しつつ AI 回答を反映（`aiImportCreateAndApplySchema`）。`asset`（name 必須、category/location は家庭所属を検証）+ `payload`。トランザクションで作成、子テーブルは全件追加（重複判定なし）。成功 201、作成資産の詳細を返す。

### AI調査プロンプト
`packages/shared` の `buildAiResearchPrompt({ assetName, assetType?, manufacturer?, modelNumber?, category? })` が、AI（ChatGPT/Claude/Gemini等）に貼り付ける調査プロンプト文字列を生成。出力JSON形式（asset/specs/links/consumables/accessories/maintenance_suggestions/notes）を指定し、「JSON以外を出力しない」「不明はnull」を指示。

## 3.7 ダッシュボード（/api/dashboard・認証必須）

### GET /api/dashboard
家庭の集計を一括取得（`deleted_at IS NULL` のみ対象）。基準日から30日以内を「もうすぐ」とする。

| キー | 内容 |
| --- | --- |
| assetCount | 資産総数 |
| warrantyExpiringSoonAssets | 保証30日以内（最大20） |
| warrantyExpiredAssets | 保証期限切れ（最大20） |
| upcomingMaintenanceAssets | 30日以内の次回メンテ（資産単位でユニーク化） |
| brokenAssets | status が broken/repairing（最大20） |
| replacementPlannedAssets | status=replacement_planned（最大20） |
| recentAssets | 直近更新10件 |
| incompleteAssets | model_number 空 または location 未設定（情報不足、最大20） |

各要素はサマリ（id, name, assetType, manufacturer, modelNumber, status, categoryName, locationName, warrantyEndDate, nextMaintenanceDate）。

## 3.8 マスタ（認証必須）

| メソッド | パス | 説明 |
| --- | --- | --- |
| GET/POST/PUT/DELETE | `/api/categories` , `/api/categories/:id` | カテゴリ CRUD |
| GET/POST/PUT/DELETE | `/api/locations` , `/api/locations/:id` | 設置場所 CRUD（階層） |

## 3.9 エクスポート（/api/export・認証必須）

### GET /api/export/json
家庭の全データ（household / categories / locations / homeAssets＋全子テーブル）を JSON ダウンロード。`Content-Disposition: attachment; filename="homeasset-export-YYYY-MM-DD.json"`。日付・金額は serialize 済み。
