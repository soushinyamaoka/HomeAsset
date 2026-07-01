import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { COLORS, SPACING } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert('入力エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      Alert.alert('ログイン失敗', e?.response?.data?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>HomeAsset</Text>
        <Text style={styles.subtitle}>家庭内資産・住宅設備台帳</Text>

        <View style={{ marginTop: SPACING.xl }}>
          <TextField
            label="メールアドレス"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextField
            label="パスワード"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button title="ログイン" onPress={onSubmit} loading={loading} />
          <TouchableOpacity
            style={{ marginTop: SPACING.lg, alignItems: 'center' }}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={{ color: COLORS.primary, fontSize: 14 }}>新規アカウントを作成する</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.xl,
    paddingTop: SPACING.xxl,
    backgroundColor: COLORS.bg,
    flexGrow: 1,
  },
  title: { fontSize: 32, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textSub, textAlign: 'center', marginTop: SPACING.xs },
});

export default LoginScreen;
