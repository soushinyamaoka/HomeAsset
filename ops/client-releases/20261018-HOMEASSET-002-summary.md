# Client Release Record

record_type: client_release

release_id: 20261018-HOMEASSET-002

app: HomeAsset (apps/mobile)

status: verified

created_by: Claude（配信前の計画として作成、2026-10-18。同日に配信を実施し、2026-10-22にapp ownerの実機確認結果を追記）

```text
client_distribution: required
client_distribution_status: verified
client_release_record: ops/client-releases/20261018-HOMEASSET-002-summary.md
```

## 対象機能・source commit

- `242ac1b4f946af70ba645c86cd1cde8ee551b82c` — feat: 他AIへ渡すAI共有用エクスポート（API・画面）を追加
- 対象機能: 設定 → エクスポート画面の「AIに渡す（整理済みJSON）」。ファイル共有（共有シート）とクリップボードコピー
- 直前の配信（20260904-HOMEASSET-001）以降、mobileの変更はこのcommitのみ

## 実施主体・承認

- 実施主体: Claude（アプリ側チャットで `eas build` / `eas update` を実行）
- 承認: 2026-10-18、app ownerがチャットで指示。notice 003のVPS反映完了を受けて「VPS管理の反映は終わりました。配信お願いします」（Android）、
  続けて「iosの方も実施してください」（iOS）。本releaseを対象とした指示で、VPS production承認の流用ではない

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

## 配信結果（2026-10-18）

### Android

- Build ID: `0da6a239-20c8-4480-b237-0474613ad45e`（profile / channel `android-internal`、distribution internal、status finished）
- commit: `a916f6b7475e655d10b71fa9779d636b98e0c97f`（`242ac1b` からの差分はdocsのみ。`apps/mobile`・`packages/shared` の差分0）
- SDK 57.0.0、Runtime Version 0.1.0、Version 0.1.0（version code 1）
- Fingerprint: `5b11044a40056c23c854547612f83db2eda61469`
- 開始: 2026-10-18 22:40:48。完了: 2026-10-18 22:49:06（配信時の `eas build:view`。2026-10-22の再表示では完了時刻が 2026-10-21 7:40:21 と表示され、食い違いの理由は未確認）
- Application Archive URL: `https://expo.dev/artifacts/eas/KHQJNexYqiNUnNcsmgYCqo0VQY5u1cfIe1PRrn1UdUI.apk`
- Android向けのEAS Updateは発行していない（計画どおり）

### iOS（Expo Go経由）

- `eas update --branch preview --environment preview --platform ios`
- Update group ID: `a69c69c0-ec04-4854-b4f1-79e1b89451aa`、iOS update ID: `01a14f44-f865-76b1-a919-d4cec3e53570`
- Runtime Version: `exposdk:57.0.0`、Message: 「AI共有用エクスポート (242ac1b)」、commit `a916f6b`
- 発行: 2026-10-18 22:48 JST
- Dashboard: https://expo.dev/accounts/soushin.yamaoka/projects/homeasset/updates/a69c69c0-ec04-4854-b4f1-79e1b89451aa

### 対象端末での確認結果

2026-10-22、app ownerから「エクスポートできました」と報告があった（AI共有用エクスポートの実機での動作）。
確認した端末（Android / iOS）・OSバージョン、共有シート・ファイル名・コピー・ネットワーク情報スイッチの個別の結果は報告されていないため、
それ以上の詳細は記録しない。同日、notice 005のproduction反映後に、アプリでのログインと資産一覧の表示も報告されている。

## test結果（配信前、ローカル）

- `npx tsc --noEmit -p apps/mobile/tsconfig.json`: 成功
- `npx expo-doctor`: 19/21（失敗2件は既存のもの。本変更による増加なし）
- 実機での動作確認: 配信後にapp ownerが実施（上記「対象端末での確認結果」）

## 配信後に記録すること

build ID / update group ID、配信日時、対象端末での確認結果（共有シートが開く・ファイル名・コピー・ネットワーク情報スイッチ）

## secret/認証情報

署名鍵・EAS認証情報の値は記録しない。
