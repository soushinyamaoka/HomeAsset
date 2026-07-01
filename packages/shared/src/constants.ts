// 管理対象種別（home_assets.asset_type）
export const ASSET_TYPES = [
  'device',
  'housing_equipment',
  'building_part',
  'furniture',
  'tool',
  'other',
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  device: '機器',
  housing_equipment: '住宅設備',
  building_part: '建物部位',
  furniture: '家具',
  tool: '工具',
  other: 'その他',
};

// 資産ステータス
export const ASSET_STATUSES = [
  'active',
  'spare',
  'broken',
  'repairing',
  'maintenance_planned',
  'replacement_planned',
  'replaced',
  'disposed',
  'sold',
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: '使用中',
  spare: '予備',
  broken: '故障中',
  repairing: '修理中',
  maintenance_planned: 'メンテナンス予定',
  replacement_planned: '交換予定',
  replaced: '交換済み',
  disposed: '廃棄済み',
  sold: '売却済み',
};

// 資産優先度
export const ASSET_PRIORITIES = ['high', 'medium', 'low'] as const;
export type AssetPriority = (typeof ASSET_PRIORITIES)[number];

export const ASSET_PRIORITY_LABELS: Record<AssetPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

// リンク種別
export const LINK_TYPES = [
  'manual',
  'warranty',
  'receipt',
  'invoice',
  'official',
  'support',
  'purchase',
  'construction_document',
  'estimate',
  'bill',
  'contract',
  'drawing',
  'other',
] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  manual: '取扱説明書',
  warranty: '保証書',
  receipt: 'レシート',
  invoice: '領収書',
  official: 'メーカー公式',
  support: 'サポート',
  purchase: '購入ページ',
  construction_document: '施工資料',
  estimate: '見積書',
  bill: '請求書',
  contract: '契約書',
  drawing: '図面',
  other: 'その他',
};

// メンテナンス種別
export const MAINTENANCE_TYPES = [
  'cleaning',
  'inspection',
  'battery_change',
  'filter_change',
  'firmware_update',
  'parts_change',
  'wall_inspection',
  'roof_inspection',
  'drain_cleaning',
  'fan_cleaning',
  'equipment_inspection',
  'other',
] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  cleaning: '掃除',
  inspection: '点検',
  battery_change: '電池交換',
  filter_change: 'フィルター交換',
  firmware_update: 'ファームウェア更新',
  parts_change: '部品交換',
  wall_inspection: '外壁点検',
  roof_inspection: '屋根点検',
  drain_cleaning: '排水管清掃',
  fan_cleaning: '換気扇清掃',
  equipment_inspection: '設備点検',
  other: 'その他',
};

// 修理ステータス
export const REPAIR_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'replaced',
  'rebought',
  'disposed',
] as const;
export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  pending: '未対応',
  in_progress: '対応中',
  completed: '修理済み',
  replaced: '交換済み',
  rebought: '買い替え',
  disposed: '廃棄',
};

// 接続方式
export const CONNECTION_TYPES = [
  'wifi',
  'ethernet',
  'bluetooth',
  'zigbee',
  'matter',
  'other',
] as const;
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

export const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  wifi: 'Wi-Fi',
  ethernet: '有線LAN',
  bluetooth: 'Bluetooth',
  zigbee: 'Zigbee',
  matter: 'Matter',
  other: 'その他',
};

// 家庭メンバーロール
export const HOUSEHOLD_ROLES = ['owner', 'member'] as const;
export type HouseholdRole = (typeof HOUSEHOLD_ROLES)[number];

// 初期カテゴリ（仕様書 21章より）
export const DEFAULT_CATEGORIES: { name: string; icon: string; asset_type?: AssetType }[] = [
  { name: '家電', icon: 'tv', asset_type: 'device' },
  { name: 'IT機器', icon: 'laptop', asset_type: 'device' },
  { name: 'ネットワーク機器', icon: 'wifi', asset_type: 'device' },
  { name: 'スマートホーム', icon: 'home', asset_type: 'device' },
  { name: '防犯カメラ', icon: 'videocam', asset_type: 'device' },
  { name: '住宅設備', icon: 'water', asset_type: 'housing_equipment' },
  { name: '建物部位', icon: 'business', asset_type: 'building_part' },
  { name: '外構', icon: 'leaf', asset_type: 'building_part' },
  { name: '家具', icon: 'bed', asset_type: 'furniture' },
  { name: '工具', icon: 'construct', asset_type: 'tool' },
  { name: 'その他', icon: 'cube', asset_type: 'other' },
];

// 初期設置場所（仕様書 20章より、階層あり）
export const DEFAULT_LOCATIONS: { name: string; parent?: string }[] = [
  { name: '1階' },
  { name: 'リビング', parent: '1階' },
  { name: 'キッチン', parent: '1階' },
  { name: '洗面所', parent: '1階' },
  { name: '浴室', parent: '1階' },
  { name: 'トイレ', parent: '1階' },
  { name: '玄関', parent: '1階' },
  { name: '2階' },
  { name: '寝室', parent: '2階' },
  { name: '子供部屋', parent: '2階' },
  { name: '屋外' },
  { name: '外壁', parent: '屋外' },
  { name: '屋根', parent: '屋外' },
  { name: 'ベランダ', parent: '屋外' },
  { name: '駐車場', parent: '屋外' },
  { name: '庭', parent: '屋外' },
  { name: '物置' },
  { name: 'サーバー棚' },
];
