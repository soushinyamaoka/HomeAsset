import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { COLORS, SPACING } from '../../theme';

const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();

  const confirmLogout = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <Text style={styles.householdName}>
          家庭: {user?.householdName} ({user?.role})
        </Text>
      </Card>

      <MenuItem
        icon="apps"
        label="カテゴリ管理"
        onPress={() => navigation.navigate('CategoryManage')}
      />
      <MenuItem
        icon="location"
        label="設置場所管理"
        onPress={() => navigation.navigate('LocationManage')}
      />
      <MenuItem
        icon="download"
        label="データエクスポート (JSON)"
        onPress={() => navigation.navigate('Export')}
      />

      <View style={{ height: SPACING.xl }} />
      <Button title="ログアウト" onPress={confirmLogout} variant="danger" />
    </ScrollView>
  );
};

const MenuItem: React.FC<{ icon: any; label: string; onPress: () => void }> = ({
  icon,
  label,
  onPress,
}) => (
  <TouchableOpacity onPress={onPress}>
    <Card>
      <View style={styles.menuRow}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
        <Text style={styles.menuLabel}>{label}</Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={COLORS.textMuted}
          style={{ marginLeft: 'auto' }}
        />
      </View>
    </Card>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, backgroundColor: COLORS.bg },
  userName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  userEmail: { fontSize: 13, color: COLORS.textSub, marginTop: 2 },
  householdName: { fontSize: 13, color: COLORS.primary, marginTop: 6, fontWeight: '600' },
  menuRow: { flexDirection: 'row', alignItems: 'center' },
  menuLabel: { fontSize: 15, color: COLORS.text, marginLeft: SPACING.md, fontWeight: '600' },
});

export default SettingsScreen;
