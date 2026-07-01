# HomeAsset 仕様書

家庭内資産・住宅設備管理アプリ **HomeAsset** の仕様書です。実装コード（`apps/api` / `apps/mobile` / `packages/shared`）を正として記述しています。

## 目次

| ドキュメント | 内容 |
| --- | --- |
| [01-overview.md](01-overview.md) | システム概要・アーキテクチャ・技術スタック・中心概念 |
| [02-data-model.md](02-data-model.md) | DB（Prisma）全テーブル定義・リレーション・列挙値 |
| [03-api.md](03-api.md) | REST API 全エンドポイント仕様・認証・バリデーション |
| [04-screens.md](04-screens.md) | モバイル画面・ナビゲーション・主要ユースケース |
| [05-non-functional.md](05-non-functional.md) | セキュリティ・非機能要件・運用・MVP制約 |

## 一言サマリ

機器・住宅設備・建物部位・家具・工具を `home_assets` テーブルで統一管理し、`household` 単位で家族間共有する資産台帳アプリ。サーバ（Fastify + Prisma + PostgreSQL）とモバイル（Expo + React Native）のモノレポ構成。

> このディレクトリは実装から起こした仕様スナップショットです。スキーマ・ルート・画面を変更したら本ドキュメントも更新してください。
