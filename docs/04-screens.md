# 04. 画面・ナビゲーション仕様

Expo + React Navigation v7。出典: `apps/mobile/src/navigation/index.tsx`、`apps/mobile/src/screens/`。

## 4.1 ナビゲーション構成

認証状態（`useAuth`）で切り替え。未ログインは Auth スタック、ログイン済みは 5タブのメインナビゲーター。

```
RootNavigator
├─ 未ログイン: AuthNavigator (Native Stack)
│   ├─ Login（ログイン）
│   └─ Register（アカウント作成）
└─ ログイン済み: MainNavigator (Bottom Tab ×5)
    ├─ ホーム(DashboardTab)   home アイコン      → Dashboard
    ├─ 資産(AssetsTab)        list アイコン      → AssetList → 詳細・各フォーム
    ├─ 追加(AddTab)           add-circle アイコン → タップで AssetForm を起動（プレースホルダ）
    ├─ AI取込(AiImportTab)    sparkles アイコン  → AiImport
    └─ 設定(SettingsTab)      settings アイコン  → Settings → 各管理画面
```

### タブの挙動
- **追加タブ**: 画面を持たず、タップで資産タブの `AssetForm`（新規登録）へ遷移。
- **資産タブ**: 既にフォーカス中に再タップすると `AssetList` ルートへ戻る。

### 資産スタック（AssetsStack）の画面
AssetList（資産一覧）/ AssetDetail（資産詳細）/ AssetForm（資産登録・編集）/ SpecForm（スペック・仕様）/ LinkForm（リンク）/ MaintenanceForm（メンテナンス履歴）/ RepairForm（修理履歴）/ ConsumableForm（消耗品）/ AccessoryForm（付属品）/ NetworkInfoForm（ネットワーク情報）/ AiImportFromAsset（資産詳細からのAI取り込み）。

### 設定スタック（SettingsStack）の画面
Settings（設定）/ CategoryManage（カテゴリ管理）/ LocationManage（設置場所管理）/ Export（データエクスポート）。

## 4.2 各画面の役割

### 認証
- **LoginScreen**: メール・パスワードでログイン。成功でJWTを secure-store に保存。
- **RegisterScreen**: メール・パスワード（8文字以上）・氏名・家庭名でアカウント＋家庭を新規作成。

### ホーム（DashboardScreen）
`GET /api/dashboard` を表示。資産総数、保証期限切れ/まもなく、修理中、メンテ予定、交換予定、情報不足、直近更新を一覧。各カードから資産詳細へ遷移。

### 資産
- **AssetListScreen**: 一覧。検索・種別/カテゴリ/設置場所/ステータス/保証フィルタ・並び替え（`assetListQuerySchema` に対応）。
- **AssetDetailScreen**: 資産本体＋全子情報（スペック・リンク・メンテ・修理・消耗品・付属品・ネットワーク）を表示。各子情報の追加・編集フォームへ遷移。廃棄（dispose）・交換（replace）操作。
- **AssetFormScreen**: 登録・編集。`Section` でセクション分けし、必須は名称のみ。`KeyboardAvoidingView` でキーボード回避。`DateField` で日付入力、`ChipSelector` で種別/ステータス/優先度を選択。
- **子テーブルフォーム**（Spec/Link/Maintenance/Repair/Consumable/Accessory/NetworkInfo）: 各子レコードの追加・編集。NetworkInfo は資産1件に1件。

### AI取込（AiImportScreen）
1. 「新規作成」か「既存資産に反映」を選択。
2. 名称・種別・メーカー・型番・カテゴリを入力 → `buildAiResearchPrompt` でプロンプト自動生成。
3. プロンプトをコピーして外部AI（ChatGPT/Claude/Gemini等）へ貼り付け。
4. AIのJSON回答を貼り付け、`POST /api/ai-import/parse` で解析・プレビュー。
5. 「既存値を上書きする」スイッチ（既定オフ）で挙動を制御し、反映（apply / create-and-apply）。

### 設定
- **SettingsScreen**: カテゴリ／設置場所管理・エクスポートへの導線、ログアウト。
- **CategoryManageScreen / LocationManageScreen**: マスタの CRUD（設置場所は階層）。
- **ExportScreen**: `GET /api/export/json` で全データを JSON エクスポート。

## 4.3 共通コンポーネント

`apps/mobile/src/components/`: Button / TextField / Card / Section / ChipSelector / StatusBadge / AssetTypeBadge / InfoRow / DateField。

## 4.4 主要ユースケースフロー

### 資産を手動登録
追加タブ → AssetForm（名称必須・他は任意）→ 保存（`POST /api/assets`）→ AssetDetail。

### AIで情報を補完
AI取込タブ → プロンプト生成・コピー → 外部AIで調査 → JSON貼り付け → parse でプレビュー → apply（既存資産・空欄のみ既定）/ create-and-apply（新規）。

### 廃棄・交換
AssetDetail → 廃棄（`dispose`: status=disposed＋論理削除、一覧から除外）/ 交換（`replace`: status=replaced、履歴として残す）。

## 4.5 UI/UX 方針

- スマホでの片手操作を最重視。フォームは `Section` でセクション分けし、必須入力は最小限。
- 入力欄は `KeyboardAvoidingView` でキーボードに隠れないようにする。
- 種別・ステータス・優先度などの列挙値は `packages/shared` のラベル定数（`*_LABELS`）で日本語表示。
