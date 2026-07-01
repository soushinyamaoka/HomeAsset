// HomeAsset カラースキーム（家庭資産管理らしくブルー系をベース）
export const COLORS = {
  primary: '#1565C0',
  primaryDark: '#0D47A1',
  primaryLight: '#42A5F5',
  accent: '#00897B',
  warning: '#E65100',
  danger: '#C62828',
  success: '#2E7D32',
  bg: '#F4F6FA',
  surface: '#FFFFFF',
  border: '#E0E0E0',
  text: '#212121',
  textSub: '#616161',
  textMuted: '#9E9E9E',
  badge: {
    active: '#43A047',
    spare: '#90A4AE',
    broken: '#E53935',
    repairing: '#FB8C00',
    maintenance_planned: '#26A69A',
    replacement_planned: '#7E57C2',
    replaced: '#5C6BC0',
    disposed: '#757575',
    sold: '#5C6BC0',
  } as Record<string, string>,
  assetType: {
    device: '#1976D2',
    housing_equipment: '#00838F',
    building_part: '#5D4037',
    furniture: '#6A1B9A',
    tool: '#EF6C00',
    other: '#546E7A',
  } as Record<string, string>,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
};

// フォントサイズ・ウェイトの階層（ハードコード分散を防ぐ）
export const TYPOGRAPHY = {
  screenTitle: { fontSize: 20, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  itemTitle: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 14 },
  label: { fontSize: 13 },
  caption: { fontSize: 12 },
} as const;
