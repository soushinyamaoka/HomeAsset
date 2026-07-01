import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AssetListScreen from '../screens/assets/AssetListScreen';
import AssetDetailScreen from '../screens/assets/AssetDetailScreen';
import AssetFormScreen from '../screens/assets/AssetFormScreen';
import SpecFormScreen from '../screens/assets/SpecFormScreen';
import LinkFormScreen from '../screens/assets/LinkFormScreen';
import MaintenanceFormScreen from '../screens/assets/MaintenanceFormScreen';
import RepairFormScreen from '../screens/assets/RepairFormScreen';
import ConsumableFormScreen from '../screens/assets/ConsumableFormScreen';
import AccessoryFormScreen from '../screens/assets/AccessoryFormScreen';
import NetworkInfoFormScreen from '../screens/assets/NetworkInfoFormScreen';
import ActionPlanFormScreen from '../screens/assets/ActionPlanFormScreen';
import AiActionPlanScreen from '../screens/assets/AiActionPlanScreen';
import AiImportScreen from '../screens/aiImport/AiImportScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import CategoryManageScreen from '../screens/settings/CategoryManageScreen';
import LocationManageScreen from '../screens/settings/LocationManageScreen';
import ExportScreen from '../screens/settings/ExportScreen';

import type {
  AuthStackParamList,
  AssetsStackParamList,
  MainTabParamList,
  DashboardStackParamList,
  SettingsStackParamList,
  AiImportStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const DashStack = createNativeStackNavigator<DashboardStackParamList>();
const AssetsStack = createNativeStackNavigator<AssetsStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const AiStack = createNativeStackNavigator<AiImportStackParamList>();

const screenHeaderOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' as const },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={screenHeaderOptions}>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: 'ログイン' }} />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'アカウント作成' }}
      />
    </AuthStack.Navigator>
  );
}

function DashboardNavigator() {
  return (
    <DashStack.Navigator screenOptions={screenHeaderOptions}>
      <DashStack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'ホーム' }} />
    </DashStack.Navigator>
  );
}

function AssetsNavigator() {
  return (
    <AssetsStack.Navigator screenOptions={screenHeaderOptions}>
      <AssetsStack.Screen name="AssetList" component={AssetListScreen} options={{ title: '資産一覧' }} />
      <AssetsStack.Screen name="AssetDetail" component={AssetDetailScreen} options={{ title: '資産詳細' }} />
      <AssetsStack.Screen name="AssetForm" component={AssetFormScreen} options={{ title: '資産登録' }} />
      <AssetsStack.Screen name="SpecForm" component={SpecFormScreen} options={{ title: 'スペック・仕様' }} />
      <AssetsStack.Screen name="LinkForm" component={LinkFormScreen} options={{ title: 'リンク' }} />
      <AssetsStack.Screen
        name="MaintenanceForm"
        component={MaintenanceFormScreen}
        options={{ title: 'メンテナンス履歴' }}
      />
      <AssetsStack.Screen name="RepairForm" component={RepairFormScreen} options={{ title: '修理履歴' }} />
      <AssetsStack.Screen name="ConsumableForm" component={ConsumableFormScreen} options={{ title: '消耗品' }} />
      <AssetsStack.Screen name="AccessoryForm" component={AccessoryFormScreen} options={{ title: '付属品' }} />
      <AssetsStack.Screen
        name="NetworkInfoForm"
        component={NetworkInfoFormScreen}
        options={{ title: 'ネットワーク情報' }}
      />
      <AssetsStack.Screen
        name="ActionPlanForm"
        component={ActionPlanFormScreen}
        options={{ title: 'メンテ計画' }}
      />
      <AssetsStack.Screen
        name="AiActionPlanForm"
        component={AiActionPlanScreen}
        options={{ title: 'AIでメンテ計画作成' }}
      />
      <AssetsStack.Screen name="AiImportFromAsset" component={AiImportScreen} options={{ title: 'AI取り込み' }} />
    </AssetsStack.Navigator>
  );
}

function AiImportNavigator() {
  return (
    <AiStack.Navigator screenOptions={screenHeaderOptions}>
      <AiStack.Screen name="AiImport" component={AiImportScreen} options={{ title: 'AI入力支援' }} />
    </AiStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={screenHeaderOptions}>
      <SettingsStack.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
      <SettingsStack.Screen
        name="CategoryManage"
        component={CategoryManageScreen}
        options={{ title: 'カテゴリ管理' }}
      />
      <SettingsStack.Screen
        name="LocationManage"
        component={LocationManageScreen}
        options={{ title: '設置場所管理' }}
      />
      <SettingsStack.Screen name="Export" component={ExportScreen} options={{ title: 'データエクスポート' }} />
    </SettingsStack.Navigator>
  );
}

function AddPlaceholder() {
  return <View />;
}

function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, any> = {
            DashboardTab: 'home',
            AssetsTab: 'list',
            AddTab: 'add-circle',
            AiImportTab: 'sparkles',
            SettingsTab: 'settings',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="DashboardTab" component={DashboardNavigator} options={{ tabBarLabel: 'ホーム' }} />
      <Tab.Screen
        name="AssetsTab"
        component={AssetsNavigator}
        options={{ tabBarLabel: '資産' }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            const parentState = navigation.getState();
            const isFocused = parentState.routes[parentState.index].name === route.name;
            if (isFocused) {
              e.preventDefault();
              navigation.navigate('AssetsTab', { screen: 'AssetList' } as any);
            }
          },
        })}
      />
      <Tab.Screen
        name="AddTab"
        component={AddPlaceholder}
        options={{ tabBarLabel: '追加' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('AssetsTab', { screen: 'AssetForm', params: {} } as any);
          },
        })}
      />
      <Tab.Screen name="AiImportTab" component={AiImportNavigator} options={{ tabBarLabel: 'AI取込' }} />
      <Tab.Screen name="SettingsTab" component={SettingsNavigator} options={{ tabBarLabel: '設定' }} />
    </Tab.Navigator>
  );
}

export const RootNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: COLORS.bg,
        }}
      >
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }
  return (
    <NavigationContainer>{user ? <MainNavigator /> : <AuthNavigator />}</NavigationContainer>
  );
};
