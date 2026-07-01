import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { ChipSelector } from '../../components/ChipSelector';
import { COLORS, SPACING } from '../../theme';
import { upsertNetworkInfo } from '../../api/children';
import { fetchAsset } from '../../api/assets';
import { invalidateAssetRelated } from '../../lib/invalidate';
import { useToast } from '../../components/Toast';
import { CONNECTION_TYPES, CONNECTION_TYPE_LABELS } from '@homeasset/shared';
import type { AssetsStackParamList } from '../../navigation/types';

type Rt = RouteProp<AssetsStackParamList, 'NetworkInfoForm'>;

const NetworkInfoFormScreen: React.FC = () => {
  const route = useRoute<Rt>();
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const toast = useToast();
  const { assetId } = route.params;

  const [ipAddress, setIpAddress] = useState('');
  const [hostName, setHostName] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [adminUrl, setAdminUrl] = useState('');
  const [port, setPort] = useState('');
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [credentialStorageMemo, setCredentialStorageMemo] = useState('');
  const [settingsMemo, setSettingsMemo] = useState('');

  const assetQuery = useQuery({ queryKey: ['asset', assetId], queryFn: () => fetchAsset(assetId) });

  useEffect(() => {
    if (assetQuery.data?.networkInfo) {
      const n = assetQuery.data.networkInfo;
      setIpAddress(n.ipAddress ?? '');
      setHostName(n.hostName ?? '');
      setMacAddress(n.macAddress ?? '');
      setAdminUrl(n.adminUrl ?? '');
      setPort(n.port == null ? '' : String(n.port));
      setConnectionType(n.connectionType);
      setCredentialStorageMemo(n.credentialStorageMemo ?? '');
      setSettingsMemo(n.settingsMemo ?? '');
    }
  }, [assetQuery.data]);

  const mutation = useMutation({
    mutationFn: () =>
      upsertNetworkInfo(assetId, {
        ipAddress: ipAddress || null,
        hostName: hostName || null,
        macAddress: macAddress || null,
        adminUrl: adminUrl || undefined,
        port: port || undefined,
        connectionType: (connectionType ?? undefined) as any,
        credentialStorageMemo: credentialStorageMemo || null,
        settingsMemo: settingsMemo || null,
      } as any),
    onSuccess: () => {
      invalidateAssetRelated(qc, assetId);
      toast.show('保存しました');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('保存失敗', e?.response?.data?.message ?? String(e)),
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TextField
          label="IPアドレス"
          value={ipAddress}
          onChangeText={setIpAddress}
          placeholder="192.168.1.100"
          autoCapitalize="none"
        />
        <TextField
          label="ホスト名"
          value={hostName}
          onChangeText={setHostName}
          autoCapitalize="none"
        />
        <TextField
          label="MACアドレス"
          value={macAddress}
          onChangeText={setMacAddress}
          autoCapitalize="none"
        />
        <TextField
          label="管理URL"
          value={adminUrl}
          onChangeText={setAdminUrl}
          placeholder="http://..."
          autoCapitalize="none"
        />
        <TextField
          label="ポート番号"
          value={port}
          onChangeText={setPort}
          keyboardType="numeric"
        />
        <ChipSelector
          label="接続方式"
          options={CONNECTION_TYPES.map((t) => ({ value: t, label: CONNECTION_TYPE_LABELS[t] }))}
          value={connectionType}
          onChange={setConnectionType}
          allowClear
        />
        <TextField
          label="認証情報の保管場所メモ"
          value={credentialStorageMemo}
          onChangeText={setCredentialStorageMemo}
          multiline
          helper="パスワード自体は保存しません（1Passwordに保存、紙の保管場所などのメモ用）"
        />
        <TextField
          label="設定メモ"
          value={settingsMemo}
          onChangeText={setSettingsMemo}
          multiline
        />
        <Button title="保存する" onPress={() => mutation.mutate()} loading={mutation.isPending} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, backgroundColor: COLORS.bg },
});

export default NetworkInfoFormScreen;
