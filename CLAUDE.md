# プロジェクト指示文

## 基本ルール

### 1. 実装前の確認プロセス

- 実装に入る前に、理解した仕様を箇条書きで整理して提示すること。
- 不明点や曖昧な点があれば、推測で進めず必ず質問すること。

### 2. 影響範囲の事前調査

- 機能の追加・変更を行う際は、実装前に影響を受ける既存の画面・コンポーネント・ロジックを洗い出し、リストとして提示すること。
- **HomeAssetはモノレポ構成（`apps/api` + `apps/mobile` + `packages/shared`）。** API・モバイル・shared のいずれにまたがる変更かを必ず先に整理すること。Zodスキーマや型を変更するときは `packages/shared` を起点に検討すること。
- **資産の子テーブル（specs / links / maintenance / repairs / consumables / accessories / network_infos）は同じ CRUD パターンで実装されている。** いずれかを変更する場合、他テーブルも同じ変更が必要か必ず確認すること。

### 3. UI/UX に関するルール

- スマホでの片手操作を最重視する。フォームは長すぎないようセクション分け（`Section` コンポーネント）し、必須入力は最小限にすること。
- 入力欄では `KeyboardAvoidingView` でキーボードに隠れないようにすること。

### 4. 段階的な進め方

- 大きな機能は一度に実装せず段階に分けて進めること。
- 各段階でユーザーの確認を取ってから次に進むこと。

---

## データ層ルール

### 1. household_id によるデータ分離

- 主要テーブルはすべて `household_id` を持ち、API は必ず `req.auth.householdId` で絞り込む。
- 新規ルートを追加する場合、`apps/api/src/utils/asset-guard.ts` の `ensureAssetInHousehold` か、`where: { id, householdId: req.auth.householdId }` パターンを必ず使用すること。

### 2. パスワード・秘密情報の扱い

- 資産情報としてパスワード・APIキー・秘密鍵・アクセストークンを **保存しない**。
- ネットワーク情報には保管場所メモ（例: "1Passwordに保存"）のみ保存する。
- ユーザーパスワードは `bcrypt` でハッシュ化（10ラウンド）してから保存する。

### 3. 日付・Decimal の取り扱い

- DB → API: `apps/api/src/utils/serialize.ts` の `serializeAsset` を通して `'YYYY-MM-DD'` 文字列 / `number` に変換してから返す。
- API → DB: `'YYYY-MM-DD'` 文字列は `parseDateOnly` で `Date` に変換してから Prisma に渡す。

### 4. 論理削除を基本にする

- `home_assets` は物理削除しない。原則として `POST /api/assets/:id/dispose` で `status = 'disposed'` + `deleted_at` 設定。
- `POST /api/assets/:id/replace` で `status = 'replaced'` に変更（履歴として残す）。
- `DELETE /api/assets/:id` は誤登録専用。
- 一覧 API はデフォルトで `deleted_at IS NULL` のみ返す。`includeDisposed` フラグで例外取得可。

### 5. AI取り込みのデフォルト挙動

- AI 回答 JSON を反映する `POST /api/assets/:id/ai-import/apply` は **空欄項目のみ反映** がデフォルト（`overwrite = false`）。
- specs / links / consumables / accessories は **重複を回避して追加**（spec_name / url / name で判定）。
- `maintenance_suggestions` は MVP では履歴に直接登録せず、プレビュー表示のみ。
- UI 側で「既存値を上書きする」スイッチを必ず提供し、デフォルトオフを維持。

### 6. asset_type の扱い

- `home_assets.asset_type` は `device | housing_equipment | building_part | furniture | tool | other` の6種別。
- 「機器のみ」と「住宅設備・建物部位を含む」では UI 上の必要項目が異なる場合がある（例: 設置日 vs 施工日）が、フォームでは両方提示し任意入力とする。
- カテゴリは `asset_type` と結びついていてもよい（`categories.asset_type` 列）が、必須ではない。

---

## 技術スタック

### モバイル（apps/mobile）

- Expo SDK 54 / React Native 0.81 / React 19.1 / TypeScript
- React Navigation v7（Bottom Tab + Native Stack）
- TanStack Query v5
- Axios / expo-secure-store / expo-clipboard
- react-hook-form

### バックエンド（apps/api）

- Node.js + Fastify 5 + TypeScript
- Prisma 5 + PostgreSQL 16（ポート5433）
- @fastify/jwt / bcryptjs
- Zod（shared から import）
- tsx（開発時の TypeScript 実行）

### 共有（packages/shared）

- Zod スキーマと TypeScript 型定義
- 定数（ASSET_TYPES, ASSET_STATUSES, LINK_TYPES 等）
- AI調査プロンプト生成関数 `buildAiResearchPrompt`

---

## プロジェクト構成

```
HomeAsset/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── server.ts             Fastify エントリ
│   │   │   ├── lib/prisma.ts
│   │   │   ├── plugins/auth.ts       JWT認証 plugin
│   │   │   ├── routes/               REST ルート群
│   │   │   │   ├── auth.ts / households.ts
│   │   │   │   ├── homeAssets.ts     資産CRUD
│   │   │   │   ├── categories.ts / locations.ts
│   │   │   │   ├── specs.ts / links.ts / maintenance.ts / repairs.ts
│   │   │   │   ├── consumables.ts / accessories.ts / networkInfos.ts
│   │   │   │   ├── aiImport.ts / dashboard.ts / exportData.ts
│   │   │   └── utils/
│   │   │       ├── validate.ts       parseBody（Zod統合）
│   │   │       ├── date.ts           parseDateOnly / formatDateOnly
│   │   │       ├── serialize.ts      serializeAsset
│   │   │       └── asset-guard.ts    ensureAssetInHousehold
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts               demo@example.com / demo1234 を作成
│   └── mobile/
│       ├── App.tsx / index.js
│       ├── app.json                  extra.apiBaseUrl を環境別に書き換え
│       ├── metro.config.js           モノレポ用 watchFolders 設定
│       └── src/
│           ├── api/                  Axios + 各リソースAPI
│           ├── components/           Button / TextField / Card / Section / ChipSelector / StatusBadge / AssetTypeBadge / InfoRow / DateField
│           ├── hooks/useAuth.tsx
│           ├── lib/queryClient.ts
│           ├── navigation/
│           ├── screens/
│           │   ├── auth/             Login / Register
│           │   ├── DashboardScreen.tsx
│           │   ├── assets/           List / Detail / Form / 各子テーブルForm
│           │   ├── aiImport/         AiImportScreen
│           │   └── settings/         Settings / CategoryManage / LocationManage / Export
│           └── theme.ts
├── packages/
│   └── shared/
│       └── src/
│           ├── constants.ts
│           └── schemas/              Zod schemas
├── docker-compose.yml                PostgreSQL 16（ポート5433）
├── package.json                      npm workspaces ルート
└── README.md
```

---

## 起動コマンド

```powershell
npm run app:start       アプリ起動[vps]   Expoのみ。VPSのAPI/DBに接続（Docker不要）
npm run app:start:local アプリ起動[local] DB(Docker)+ローカルAPI+Expo を一括起動
npm run app:stop        アプリ停止        API/Expo終了、（起動中なら）DB停止
npm run app:status      状態確認

npm run deploy          VPS再デプロイ     ソース転送→APIイメージ再ビルド→入れ替え→/health確認
                        （-- -DryRun で送信内容確認 / -- -NoCache でキャッシュ無し）
npm run export:analysis 分析用データ抽出   VPSのDBから exports/<日時>/ にCSV一式＋ネストJSON（全ID付き）
npm run import:action-plans アクション計画投入 構造化JSONを action_plans に upsert（-- -Target vps / -- -DryRun）

npm run db:up           PostgreSQL（Docker）起動 → localhost:5433
npm run db:down         PostgreSQL停止
npm run api:dev         API 開発サーバ起動（tsx watch、localhost:4001）
npm run api:migrate     Prisma マイグレーション
npm run api:seed        Prisma seed
npm run mobile:start    Expo起動
```

- Expo の接続先は環境変数 `EXPO_PUBLIC_API_TARGET`（`vps`=既定 / `local`）で切り替わる（`apps/mobile/src/api/client.ts`）。`vps` は `app.json` の `extra.apiBaseUrl`、`local` は PC の LAN IP:4001 に自動解決。`EXPO_PUBLIC_API_BASE_URL=<URL>` で明示上書き可。
- 初回セットアップは `README.md` を参照。

---

## コミット・PR時の注意

- `.env` はコミットしない（`.gitignore` 済み）。`.env.example` を更新したら README にも反映する。
- Prisma schema を変更したら必ず migration を生成し、`apps/api/prisma/migrations/` を commit する。
- shared の型/スキーマを変更した場合、API と mobile の両方で参照箇所を更新する。
- 資産の子テーブル（specs/links/...）を増やす場合、shared schema → API route → mobile API client → mobile Form 画面 → AssetDetail 表示 の 5箇所を漏れなく更新する。
