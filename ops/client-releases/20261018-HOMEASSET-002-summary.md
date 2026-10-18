# Client Release Record

record_type: client_release

release_id: 20261018-HOMEASSET-002

app: HomeAsset (apps/mobile)

status: planned

created_by: Claude（配信前の計画として作成、2026-10-18）

```text
client_distribution: required
client_distribution_status: not_started
client_release_record: ops/client-releases/20261018-HOMEASSET-002-summary.md
```

## 対象機能・source commit

- `242ac1b4f946af70ba645c86cd1cde8ee551b82c` — feat: 他AIへ渡すAI共有用エクスポート（API・画面）を追加
- 対象機能: 設定 → エクスポート画面の「AIに渡す（整理済みJSON）」。ファイル共有（共有シート）とクリップボードコピー
- 直前の配信（20260904-HOMEASSET-001）以降、mobileの変更はこのcommitのみ

## 実施主体・承認

- 実施主体: 未定（app ownerの指示を受けたアプリ側チャット）
- 承認: **未取得**。配信はこのreleaseを特定したapp ownerの明示承認後にだけ行う。VPS production承認は流用しない

## server/APIとの前後関係

- 前提: `ops/server-change-notices/20261018-HOMEASSET-003-summary.md` のAPI変更（`GET /api/export/ai`）がproductionで
  **applied以降**になってから配信する
- 未反映のAPIに新clientが当たると、AI共有用データの作成だけが404エラー表示になる（他機能・データへの影響なし）

## native変更の扱い（重要）

- native moduleを2つ追加: `expo-sharing` ~57.0.23（config plugin `expo-sharing`を`app.json`に追加）、`expo-file-system` ~57.0.7
- **Android: 既存binary（build `c8ef669d`）へのJS-only配信は不可。新しいbinaryのビルドと配布が必要**
- `runtimeVersion: appVersion`（`0.1.0`固定）のため、runtimeVersionは今回のnative変更を区別しない。
  `preview`等のchannelでAndroid向けJS updateを出すと、旧binaryに届いて`expo-sharing`が見つからず落ちる恐れがある。
  Android向けにはEAS Updateを発行しない（iOSの`eas update`は`--platform ios`に限定する）

## 配信計画

### Android

- 方式: EAS Build（内部配布APK）、profile / channel `android-internal`
- 配信前に確認すること: build ID、fingerprint、`expo-sharing` / `expo-file-system`の組み込み（build log）
- rollback先: build `c8ef669d-0be6-428c-b004-f528d3b12288`（SDK 57、20260904-HOMEASSET-001で配布・verified）のAPKを再配布

### iOS（Expo Go経由）

- 方式: `eas update --branch preview --environment preview --platform ios`
- Runtime: `exposdk:57.0.0`。Expo Go SDK 57は`expo-sharing` / `expo-file-system`を内包しているためbinary配布は不要
- rollback先: update group `a54b0918-284b-4085-bf0a-a0521c919db1`（20260904-HOMEASSET-001）を`eas update:republish`で再配信

## test結果（配信前、ローカル）

- `npx tsc --noEmit -p apps/mobile/tsconfig.json`: 成功
- `npx expo-doctor`: 19/21（失敗2件は既存のもの。本変更による増加なし）
- 実機での動作確認: 未実施（配信後にapp ownerが確認する）

## 配信後に記録すること

build ID / update group ID、配信日時、対象端末での確認結果（共有シートが開く・ファイル名・コピー・ネットワーク情報スイッチ）

## secret/認証情報

署名鍵・EAS認証情報の値は記録しない。
