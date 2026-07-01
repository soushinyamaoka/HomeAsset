# 01. システム概要

## 1.1 プロダクト概要

HomeAsset は、家庭内の資産を一元管理するスマホアプリです。次の6種別を「家庭内資産台帳」として記録し、保証期限・メンテナンス・修理・交換予定を追跡します。

- 家電・IT機器・ネットワーク機器・スマートホーム・防犯カメラ（`device`）
- 給湯器・キッチン・浴室・トイレなどの住宅設備（`housing_equipment`）
- 外壁・屋根・窓・玄関ドアなどの建物部位（`building_part`）
- 家具（`furniture`）／工具（`tool`）／その他（`other`）

正式データはサーバ側 PostgreSQL に保存し、`household`（家庭）単位で家族間共有します。

## 1.2 中心概念: home_assets

機器も住宅設備も建物部位も、すべて単一の `home_assets` テーブルで統一管理し、`asset_type` 列で種別を区別します。カテゴリごとに異なる仕様項目（PCのCPU、NASのRAID構成、外壁の塗料名、給湯器の号数など）は固定カラムにせず、子テーブル `asset_specs` に自由項目として保持します。

資産に紐づく情報は以下の子テーブルに分離されています（すべて同じ CRUD パターン）。

| 子テーブル | 役割 |
| --- | --- |
| `asset_specs` | 仕様（スペック）の自由項目 |
| `asset_links` | 関連URL（取説・保証書・購入ページ等） |
| `maintenance_records` | メンテナンス履歴・次回予定 |
| `repair_records` | 修理・故障履歴 |
| `consumables` | 消耗品（交換部品・フィルター等） |
| `accessories` | 付属品 |
| `network_infos` | ネットワーク情報（資産1件に対し最大1件） |

## 1.3 モノレポ構成

```
HomeAsset/                     npm workspaces ルート
├── apps/
│   ├── api/                   Fastify + Prisma サーバー（:4001）
│   └── mobile/                Expo + React Native アプリ
├── packages/
│   └── shared/                Zodスキーマ・型・定数（API/Mobile 共有）
├── docker-compose.yml         PostgreSQL 16（:5433）
└── docs/                      本仕様書
```

API・モバイルともに `packages/shared` の Zod スキーマと定数を import して、バリデーションと型を共通化しています。

## 1.4 技術スタック

### モバイル（apps/mobile）
- Expo SDK 54 / React Native 0.81 / React 19.1 / TypeScript
- React Navigation v7（Bottom Tab + Native Stack）
- TanStack Query v5（サーバ状態管理）
- Axios / expo-secure-store（JWT保管）/ expo-clipboard
- react-hook-form

### バックエンド（apps/api）
- Node.js + Fastify 5 + TypeScript
- Prisma 5 + PostgreSQL 16（ポート5433）
- @fastify/jwt（認証）/ bcryptjs（パスワードハッシュ）
- @fastify/cors / @fastify/sensible
- Zod（shared から import）/ tsx（開発実行）

### 共有（packages/shared）
- Zod スキーマと TypeScript 型定義
- 定数（`ASSET_TYPES`, `ASSET_STATUSES`, `LINK_TYPES` 等）
- AI調査プロンプト生成関数 `buildAiResearchPrompt`

## 1.5 データ変換の方針

DB と API/クライアント間で、日付と金額の表現を統一します。

- **DB → API**: `utils/serialize.ts` の `serializeAsset` を通し、`Date`（@db.Date）→ `'YYYY-MM-DD'` 文字列、`Decimal` → `number` に変換して返す。ネスト/配列も再帰的に変換。
- **API → DB**: `'YYYY-MM-DD'` 文字列は `utils/date.ts` の `parseDateOnly` で `Date` に変換して Prisma に渡す。

## 1.6 ポート・接続情報

| サービス | URL / ポート |
| --- | --- |
| API サーバー | `http://localhost:4001`（`0.0.0.0` でリッスン、`/health` でヘルスチェック） |
| PostgreSQL | `localhost:5433`（DB名 `homeasset`） |
| モバイル → API | `apps/mobile/app.json` の `expo.extra.apiBaseUrl`。実機接続時はPCのLAN IPを設定 |

HomeGear（別アプリ）とポート衝突しないよう、HomeAsset は API `4001` / DB `5433` を使用します。
