# 02. データモデル

PostgreSQL 16 + Prisma 5。出典: `apps/api/prisma/schema.prisma`。全テーブルは `snake_case` にマッピング（`@map`）されています。主キーは `cuid()` 文字列です。

## 2.1 リレーション概要

```
User ──< HouseholdMember >── Household
                                 │
                                 ├──< Category
                                 ├──< Location (自己参照: parent/children)
                                 └──< HomeAsset
                                         ├──< AssetSpec
                                         ├──< AssetLink
                                         ├──< MaintenanceRecord
                                         ├──< RepairRecord
                                         ├──< Consumable
                                         ├──< Accessory
                                         ├──── NetworkInfo (1:1)
                                         └──< AiImportLog
```

- すべての主要テーブルは `household_id` を持ち、`Household` 削除時に `onDelete: Cascade`。
- 子テーブルは `home_assets` 削除時に Cascade（`AiImportLog` のみ `SetNull`）。
- ユーザーは複数家庭に所属可能（`HouseholdMember` 中間テーブル）。ただし現状アプリは「最古の所属」を主家庭として扱う。

## 2.2 認証・家庭

### users
| 列 | 型 | 制約 |
| --- | --- | --- |
| id | String | PK (cuid) |
| email | String | unique |
| name | String | |
| password_hash | String | bcrypt(10ラウンド) |
| created_at / updated_at | DateTime | |

### households
| 列 | 型 | 制約 |
| --- | --- | --- |
| id | String | PK |
| name | String | |
| created_at / updated_at | DateTime | |

### household_members
| 列 | 型 | 制約 |
| --- | --- | --- |
| id | String | PK |
| household_id | String | FK → households (Cascade) |
| user_id | String | FK → users (Cascade) |
| role | String | `owner` / `member`（既定 `member`） |

`@@unique([household_id, user_id])`、`@@index([user_id])`。

## 2.3 マスタ

### categories
| 列 | 型 | 説明 |
| --- | --- | --- |
| id | String | PK |
| household_id | String | FK (Cascade) |
| name | String | `@@unique([household_id, name])` |
| asset_type | String? | 任意。`device` 等と結び付け可 |
| icon | String? | アイコン名（Ionicons） |
| sort_order | Int | 既定 0 |

### locations
| 列 | 型 | 説明 |
| --- | --- | --- |
| id | String | PK |
| household_id | String | FK (Cascade) |
| name | String | `@@unique([household_id, name])` |
| parent_id | String? | 自己参照（階層構造） |
| memo | String? | |
| sort_order | Int | 既定 0 |

## 2.4 home_assets（中心テーブル）

| 列 | 型 | 説明 |
| --- | --- | --- |
| id | String | PK |
| household_id | String | FK (Cascade) |
| asset_type | String | 既定 `device`。6種別（→ 2.9） |
| name | String | 名称（必須） |
| category_id | String? | FK → categories |
| manufacturer | String? | メーカー |
| model_number | String? | 型番 |
| serial_number | String? | シリアル番号 |
| location_id | String? | FK → locations |
| status | String | 既定 `active`（→ 2.9） |
| priority | String | 既定 `medium`（high/medium/low） |
| **購入・設置・施工** | | |
| purchase_date | Date? | 購入日 |
| installed_date | Date? | 設置日 |
| construction_date | Date? | 施工日 |
| purchase_store | String? | 購入店 |
| contractor_name | String? | 施工業者名 |
| contractor_contact | String? | 施工業者連絡先 |
| contact_person | String? | 担当者 |
| purchase_price | Decimal(12,2)? | 購入価格 |
| construction_cost | Decimal(12,2)? | 施工費用 |
| purchase_url | String? | 購入ページURL |
| order_number | String? | 注文番号 |
| contract_number | String? | 契約番号 |
| receipt_url | String? | レシートURL |
| construction_document_url | String? | 施工資料URL |
| **保証** | | |
| warranty_start_date | Date? | 保証開始日 |
| warranty_end_date | Date? | 保証終了日 |
| has_extended_warranty | Boolean | 延長保証（既定 false） |
| warranty_memo | String? | 保証メモ |
| **取説・サポート** | | |
| manual_url / official_url / support_url | String? | 取説・公式・サポートURL |
| **写真** | | |
| photo_url / label_photo_url / before_photo_url / after_photo_url | String? | 写真URL（URL保存のみ） |
| **寿命・交換** | | |
| expected_lifespan_years | Int? | 想定寿命（年） |
| replacement_due_date | Date? | 交換予定日 |
| memo | String? | 備考 |
| created_at / updated_at | DateTime | |
| deleted_at | DateTime? | 論理削除日時（NULL=有効） |

インデックス: `household_id`、`[household_id, status]`、`[household_id, asset_type]`、`[household_id, deleted_at]`。

## 2.5 子テーブル

### asset_specs（仕様の自由項目）
`id`, `household_id`, `asset_id`(Cascade), `spec_name`(必須), `spec_value?`, `unit?`, `memo?`, `sort_order`。

### asset_links（関連URL）
`id`, `household_id`, `asset_id`(Cascade), `link_type`(必須), `title?`, `url`(必須), `memo?`。

### maintenance_records（メンテナンス履歴）
`id`, `household_id`, `asset_id`(Cascade), `maintenance_date`(Date必須), `maintenance_type`(必須), `description?`, `cost(Decimal)?`, `performed_by?`, `vendor_name?`, `next_due_date(Date)?`, `photo_url?`, `document_url?`, `memo?`。
インデックス: `asset_id`、`[household_id, next_due_date]`。

### repair_records（修理・故障履歴）
`id`, `household_id`, `asset_id`(Cascade), `occurred_date`(Date必須), `symptom?`, `cause?`, `action_taken?`, `vendor_name?`, `ticket_number?`, `estimated_cost(Decimal)?`, `cost(Decimal)?`, `used_warranty`(Bool既定false), `completed_date(Date)?`, `status`(既定 `pending`), `photo_url?`, `estimate_url?`, `invoice_url?`, `memo?`。

### consumables（消耗品）
`id`, `household_id`, `asset_id`(Cascade), `name`(必須), `manufacturer?`, `model_number?`, `replacement_interval_text?`, `last_replaced_date(Date)?`, `next_replacement_date(Date)?`, `purchase_url?`, `memo?`。

### accessories（付属品）
`id`, `household_id`, `asset_id`(Cascade), `name`(必須), `quantity(Int)?`, `storage_location?`, `memo?`。

### network_infos（ネットワーク情報・1:1）
`id`, `household_id`, `asset_id`(**unique** = 資産1件に最大1件), `ip_address?`, `host_name?`, `mac_address?`, `admin_url?`, `port(Int)?`, `connection_type?`, `credential_storage_memo?`（保管場所メモのみ）, `settings_memo?`。

> パスワード・APIキー等の秘密情報そのものは保存しません（保管場所メモのみ）。

## 2.6 AI取り込みログ

### ai_import_logs
`id`, `household_id`, `asset_id?`(SetNull), `source_ai_name?`, `input_prompt?`, `raw_response?`, `parsed_json(Json)?`, `imported_at`, `memo?`。

## 2.7 移行管理（HomeGear→HomeAsset）

### migration_mappings
旧ID→新IDの対応表。`migration_name`, `source_table`, `source_id`, `target_table`, `target_id`。`@@unique([migration_name, source_table, source_id, target_table])`。

### migration_logs
移行実行ログ。`migration_name`, `mode`（dry-run/execute/verify）, `status`（success/failed/partial）, `started_at`, `finished_at?`, `summary_json?`, `error_message?`。

## 2.8 論理削除・データ分離の方針

- `home_assets` は原則物理削除しない。`dispose`（`status=disposed` + `deleted_at`）/ `replace`（`status=replaced`）で履歴を残す。`DELETE` は誤登録専用。
- 一覧 API は既定で `deleted_at IS NULL` のみ返す（`includeDisposed` で例外取得可）。
- すべてのクエリは `req.auth.householdId` で絞り込み、家庭間のデータを分離する。

## 2.9 列挙値（packages/shared/src/constants.ts）

| 定数 | 値 |
| --- | --- |
| **ASSET_TYPES** | device(機器) / housing_equipment(住宅設備) / building_part(建物部位) / furniture(家具) / tool(工具) / other(その他) |
| **ASSET_STATUSES** | active(使用中) / spare(予備) / broken(故障中) / repairing(修理中) / maintenance_planned(メンテ予定) / replacement_planned(交換予定) / replaced(交換済み) / disposed(廃棄済み) / sold(売却済み) |
| **ASSET_PRIORITIES** | high(高) / medium(中) / low(低) |
| **LINK_TYPES** | manual / warranty / receipt / invoice / official / support / purchase / construction_document / estimate / bill / contract / drawing / other |
| **MAINTENANCE_TYPES** | cleaning / inspection / battery_change / filter_change / firmware_update / parts_change / wall_inspection / roof_inspection / drain_cleaning / fan_cleaning / equipment_inspection / other |
| **REPAIR_STATUSES** | pending(未対応) / in_progress(対応中) / completed(修理済み) / replaced(交換済み) / rebought(買い替え) / disposed(廃棄) |
| **CONNECTION_TYPES** | wifi / ethernet / bluetooth / zigbee / matter / other |
| **HOUSEHOLD_ROLES** | owner / member |

### 初期データ（新規登録時に自動投入）
- **初期カテゴリ**（`DEFAULT_CATEGORIES`）: 家電 / IT機器 / ネットワーク機器 / スマートホーム / 防犯カメラ / 住宅設備 / 建物部位 / 外構 / 家具 / 工具 / その他。
- **初期設置場所**（`DEFAULT_LOCATIONS`、階層あり）: 1階（リビング・キッチン・洗面所・浴室・トイレ・玄関）/ 2階（寝室・子供部屋）/ 屋外（外壁・屋根・ベランダ・駐車場・庭）/ 物置 / サーバー棚。
