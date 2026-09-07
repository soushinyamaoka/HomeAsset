# Client Release Record

record_type: client_release

release_id: 20260904-HOMEASSET-001

app: HomeAsset (apps/mobile)

status: verified

created_by: Claude（事後記録、2026-09-06。配信自体は2026-09-04に実施済み。2026-09-07にユーザーの実機確認結果を追記）

## 記録作成の経緯（重要）

本記録は、`work/ai_handoff/AI_INSTRUCTIONS.md`（`policy_bundle_version: 2026-09-04.1`）で新設された
「VPS外のclient配信」節の要件に基づき、**配信実施（2026-09-04）後に事後作成**したものである。
配信当時、この記録要件はまだ存在しなかった（または少なくともアプリ側チャットには未配布だった）ため、
配信前の`ops/client-releases/`計画作成・事前承認記録という手順そのものは踏んでいない。
本記録は、実際に何が行われたかを事実としてそのまま記録するものであり、
手順を遡って「事前に正しく承認・計画されていた」ことにするものではない。

## client_distribution判定

```text
client_distribution: required
client_distribution_status: verified
client_release_record: ops/client-releases/20260904-HOMEASSET-001-summary.md
```

判定理由: Expo SDKを54→57へ更新し、Android・iOSの双方で利用者端末への配信（Android internal APK再配布、
iOS向けEAS Update）が必要だった。VPS/API側の変更は伴わない（下記「server/APIとの前後関係」参照）。

## 対象機能・source commit

このrelease対象のcommitはすべて`main`ブランチ、以下の3件（`origin/main`へpush済み・tracked clean確認済み）。

- `63a9c1adb187ec6850faf6927fef2f74cea49146` — chore(mobile): Expo SDKを54から57へ段階的にアップグレード
- `74a52f7ff8cc31bab20e574ffd0e728942c5a902` — fix(mobile): expo-splash-screenプラグインのimage未指定によるAndroidビルド失敗を修正
- （Android再ビルドの起点となったcommitは`74a52f7`。iOS向けEAS Updateは`63a9c1a`時点で実施）

対象機能: Expo SDK 54→57へのアップグレードそのもの（新機能追加ではなく、依存関係・ランタイムの更新）。
react-native 0.81.5→0.86.3、React 19.1.0→19.2.3、TypeScript 5.9→6.0系を含む、
本アプリでは最大規模のnative依存更新。

## 実施主体・承認

- 実施主体: Claude（このチャットセッション内で`eas build` / `eas update`を実行）
- 承認: 2026-09-04、チャットにてapp owner（soushin.yamaoka、EASアカウント本人）が
  「Android用のアプリ配布、iOS用のeas updateを早急に行ってください。当初の指示は取り消します」と明示指示。
  この指示は今回のrelease（SDK54→57アップグレード）を対象として特定したものであり、
  VPS側のproduction承認を流用したものではない（VPS側の変更はそもそも本releaseに含まれない）。
- **事前の書面計画は無かった**（口頭＝チャット指示のみ）。本記録がそれに代わる事後記録である。

## server/APIとの前後関係

server_impact: none（本releaseはmobileアプリのみの変更。`apps/api`・`packages/shared`・VPS構成への変更を含まない）

確認内容: 対象commit `63a9c1a` / `74a52f7`の変更ファイルは`apps/mobile/`配下のみ
（`app.json` / `package.json` / `package-lock.json`）。API/DB/VPS側の変更なし。
そのためVPS側の`applied` / `verified`等のgate待ちは発生しない。

## Android配信

### 配信経路

- 方式: EAS Build（内部配布APK）
- Profile: `android-internal`
- Channel: `android-internal`
- Distribution: internal

### native変更の扱い（重要）

react-native含む多数のnative moduleがSDK3世代分（54→57）更新されているため、
**既存の稼働中バイナリへJS updateのみを配信する方式は取らず、新しいnative binaryをビルドして配布した。**
`runtimeVersion: appVersion`ポリシー（`0.1.0`固定）のためruntimeVersion自体はSDK更新を区別しないが、
既存bynaryへのJS-only配信ではなく新規ビルド配布としたことで、native非互換のリスクを回避している。

### ビルド履歴（今回のrelease分）

| Build ID | commit | Status | SDK | Runtime | 開始時刻 |
|---|---|---|---|---|---|
| `b2be39e7-e0d9-407f-a3e0-c8c9fb7cd7f9` | `63a9c1a` | **errored** | 57.0.0 | 0.1.0 | 2026-09-04 15:56:50 |
| `c8ef669d-0be6-428c-b004-f528d3b12288` | `74a52f7` | **finished** | 57.0.0 | 0.1.0 | 2026-09-04 16:32:02 |

- 1回目（`b2be39e7`）は`expo-splash-screen`プラグインの設定不備（`image`未指定でAndroid 12+ splash themeが
  存在しない`@drawable/splashscreen_logo`を参照）によりGradleの`processReleaseResources`が失敗。
  `Application Archive URL: null`（成果物なし）。
- `74a52f7`でプラグイン設定を削除し修正。ローカルの`expo prebuild --platform android --clean`で
  drawableリソースが正しく生成されることを確認した上で再ビルドし、2回目（`c8ef669d`）が成功。
- 成功ビルドのFingerprint: `35f333764d1933f51c386a0fd16f4632c0ae0f2e`
- Application Archive URL: `https://expo.dev/artifacts/eas/PYe5fvDIBvxt4JKskiQD7kISnKN02G_DzpEixTFYI00.apk`

### 直前の安定版（rollback先）

| Build ID | commit | SDK | Runtime | 完了日 |
|---|---|---|---|---|
| `6342ea44-905c-489d-8742-137584b013e4` | `5e2eb81` | 54.0.0 | 0.1.0 | 2026-08-10 |

Application Archive URL: `https://expo.dev/artifacts/eas/f9w7SN5K2lCvSeHmml-gwNvQvlBQ_JNqrEz4D4WMTig.apk`

rollback方法: 上記URLのAPKを再配布する（`android-internal`channelの新規build発行は不要、既存artifactの再配布で足りる）。
DB/APIとの依存はないため、rollbackに伴うデータ側の互換性問題は無い。

### 対象端末での確認結果

2026-09-07、ユーザーより実機確認で問題なかったと報告あり。具体的な確認端末・OSバージョン・
確認した画面/機能の内訳は報告されていないため、それ以上の詳細はここには記録しない。

## iOS配信（Expo Go経由）

### 配信経路

- 方式: EAS Update（`eas update --branch preview --environment preview`）
- Branch: `preview`
- **カスタムnative binaryではなくExpo Go経由で利用**（本プロジェクトはEAS Build上にiOS向けbuildが
  一度も存在しない。Expo Goアプリで`eas update`発行後のQRコードを読み取って使用する運用と、
  ユーザー本人がチャットで説明）。
- Runtime Version: `exposdk:57.0.0`（Expo Go互換の特別なruntime識別子。SDK 57対応のExpo Goアプリでのみ読み込み可能）
- Update Group ID: `a54b0918-284b-4085-bf0a-a0521c919db1`
- iOS Update ID: `01a06b37-dd83-7734-a80a-7c5512817edf`
- Message: "Expo SDKを54から57へアップグレード"
- 発行日時: 2026-09-04（`eas update:view`で確認、"1 day ago"表示）
- Dashboard: https://expo.dev/accounts/soushin.yamaoka/projects/homeasset/updates/a54b0918-284b-4085-bf0a-a0521c919db1

同じ`eas update`実行でAndroid向け更新（Update Group ID `90a31937-aa95-46b1-bb71-7079761722a2`、
Runtime Version `0.1.0`）も`preview`branchへ発行されている。ただしAndroidの実配布は上記の
`android-internal`channel経由のbuildを正としており、`preview`channelのこの更新は
主にiOS/Expo Go向け発行の副産物。`preview`channelを購読するAndroid端末が存在する場合、
runtimeVersion `0.1.0`が一致するため配信対象になり得る点は未確認のまま残る（下記「未解決事項」参照）。

### native変更の扱い（重要）

Expo Go自体がSDKごとに独立したnative runtimeを内包しているため、「既存native binaryへJS-only配信」に
該当する場面ではない。ただし、ユーザーの端末のExpo GoアプリがSDK 57に対応した版になっていない場合、
この更新は読み込めない（Expo Go側のアプリ更新が別途必要になる可能性がある）。

### 直前の安定版（rollback先）

`preview`branchの直前のiOS向け発行は2026-06-29（Runtime Version `0.1.0`、
"機器情報のコピーとWeb検索を追加"）だが、これはSDK54時代の`appVersion`ベースruntimeであり、
今回の`exposdk:57.0.0`とは別系統。**Expo Go側がSDK54を引き続きサポートしているかは未確認**であり、
Expo Goの対応SDK範囲によっては、この過去updateへの単純な「再配信」によるrollbackが機能しない可能性がある。

### 対象端末での確認結果

2026-09-07、ユーザーより実機確認で問題なかったと報告あり（Android分と同時に報告）。
Expo Goアプリ自体がSDK 57対応版であったこと、およびQRコード読み取り経由での起動成功を含意するが、
Expo Goのバージョン番号等の詳細は報告されていない。

## 未解決事項

- `preview`channelのAndroid向け更新（Runtime `0.1.0`）が、`android-internal`以外の実端末に
  意図せず配信される経路がないか未確認。
- iOSのrollback手順（Expo Go側のSDK対応範囲に依存）は実地未検証。
- 事前の`ops/client-releases/`計画作成・書面承認は行われていない（本記録は事後記録）。今後同種の
  release（特にnative依存を伴うSDK更新）は、配信前に本ディレクトリへ計画を作成する運用に切り替える。

## secret/認証情報

署名鍵・EAS認証情報の値はこの記録に含めていない（EAS管理のリモート署名を使用。値は未取得・未記録）。
