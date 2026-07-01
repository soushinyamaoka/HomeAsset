// React Navigation 型定義
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  DashboardTab: undefined;
  AssetsTab: undefined;
  AddTab: undefined;
  AiImportTab: undefined;
  SettingsTab: undefined;
};

export type AssetsStackParamList = {
  AssetList: undefined;
  AssetDetail: { assetId: string };
  AssetForm: { assetId?: string };
  SpecForm: { assetId: string; specId?: string };
  LinkForm: { assetId: string; linkId?: string };
  MaintenanceForm: { assetId: string; recordId?: string };
  RepairForm: { assetId: string; recordId?: string };
  ConsumableForm: { assetId: string; consumableId?: string };
  AccessoryForm: { assetId: string; accessoryId?: string };
  NetworkInfoForm: { assetId: string };
  ActionPlanForm: { assetId: string };
  AiActionPlanForm: { assetId: string };
  AiImportFromAsset: { assetId: string };
};

export type DashboardStackParamList = {
  Dashboard: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  CategoryManage: undefined;
  LocationManage: undefined;
  Export: undefined;
};

export type AiImportStackParamList = {
  AiImport: { assetId?: string };
};
