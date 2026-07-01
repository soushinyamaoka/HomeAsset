import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { DateField } from '../../components/DateField';
import { ChipSelector } from '../../components/ChipSelector';
import { COLORS, SPACING } from '../../theme';
import { createMaintenance, updateMaintenance } from '../../api/children';
import { fetchAsset } from '../../api/assets';
import { invalidateAssetRelated } from '../../lib/invalidate';
import { todayStr } from '../../lib/dateUtils';
import { useToast } from '../../components/Toast';
import { MAINTENANCE_TYPES, MAINTENANCE_TYPE_LABELS } from '@homeasset/shared';
import type { AssetsStackParamList } from '../../navigation/types';

type Rt = RouteProp<AssetsStackParamList, 'MaintenanceForm'>;

const MaintenanceFormScreen: React.FC = () => {
  const route = useRoute<Rt>();
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const toast = useToast();
  const { assetId, recordId } = route.params;

  const [maintenanceDate, setMaintenanceDate] = useState(todayStr());
  const [maintenanceType, setMaintenanceType] = useState<string>('cleaning');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [memo, setMemo] = useState('');

  const assetQuery = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => fetchAsset(assetId),
    enabled: !!recordId,
  });

  useEffect(() => {
    navigation.setOptions({ title: recordId ? 'メンテナンス編集' : 'メンテナンス追加' });
  }, [recordId, navigation]);

  useEffect(() => {
    if (recordId && assetQuery.data) {
      const r = assetQuery.data.maintenanceRecords.find((x) => x.id === recordId);
      if (r) {
        setMaintenanceDate(r.maintenanceDate);
        setMaintenanceType(r.maintenanceType);
        setDescription(r.description ?? '');
        setCost(r.cost == null ? '' : String(r.cost));
        setPerformedBy(r.performedBy ?? '');
        setVendorName(r.vendorName ?? '');
        setNextDueDate(r.nextDueDate ?? '');
        setPhotoUrl(r.photoUrl ?? '');
        setDocumentUrl(r.documentUrl ?? '');
        setMemo(r.memo ?? '');
      }
    }
  }, [recordId, assetQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const input = {
        maintenanceDate,
        maintenanceType: maintenanceType as any,
        description: description || null,
        cost: cost || undefined,
        performedBy: performedBy || null,
        vendorName: vendorName || null,
        nextDueDate: nextDueDate || undefined,
        photoUrl: photoUrl || undefined,
        documentUrl: documentUrl || undefined,
        memo: memo || null,
      };
      if (recordId) return updateMaintenance(recordId, input as any);
      return createMaintenance(assetId, input as any);
    },
    onSuccess: () => {
      invalidateAssetRelated(qc, assetId);
      toast.show(recordId ? '更新しました' : '追加しました');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('保存失敗', e?.response?.data?.message ?? String(e)),
  });

  const onSubmit = () => {
    if (!maintenanceDate) {
      Alert.alert('入力エラー', '実施日を入力してください');
      return;
    }
    mutation.mutate();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <DateField label="実施日 *" value={maintenanceDate} onChange={setMaintenanceDate} />
        <ChipSelector
          label="種別"
          options={MAINTENANCE_TYPES.map((t) => ({ value: t, label: MAINTENANCE_TYPE_LABELS[t] }))}
          value={maintenanceType}
          onChange={(v) => v && setMaintenanceType(v)}
        />
        <TextField label="作業内容" value={description} onChangeText={setDescription} multiline />
        <TextField label="費用" value={cost} onChangeText={setCost} keyboardType="numeric" />
        <TextField label="実施者" value={performedBy} onChangeText={setPerformedBy} />
        <TextField label="業者名" value={vendorName} onChangeText={setVendorName} />
        <DateField label="次回予定日" value={nextDueDate} onChange={setNextDueDate} />
        <TextField
          label="関連写真URL"
          value={photoUrl}
          onChangeText={setPhotoUrl}
          autoCapitalize="none"
        />
        <TextField
          label="関連資料URL"
          value={documentUrl}
          onChangeText={setDocumentUrl}
          autoCapitalize="none"
        />
        <TextField label="メモ" value={memo} onChangeText={setMemo} multiline />
        <Button
          title={recordId ? '更新する' : '追加する'}
          onPress={onSubmit}
          loading={mutation.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, backgroundColor: COLORS.bg },
});

export default MaintenanceFormScreen;
