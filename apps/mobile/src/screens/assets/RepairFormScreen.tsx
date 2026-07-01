import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { DateField } from '../../components/DateField';
import { ChipSelector } from '../../components/ChipSelector';
import { COLORS, SPACING } from '../../theme';
import { createRepair, updateRepair } from '../../api/children';
import { fetchAsset } from '../../api/assets';
import { invalidateAssetRelated } from '../../lib/invalidate';
import { todayStr } from '../../lib/dateUtils';
import { useToast } from '../../components/Toast';
import { REPAIR_STATUSES, REPAIR_STATUS_LABELS } from '@homeasset/shared';
import type { AssetsStackParamList } from '../../navigation/types';

type Rt = RouteProp<AssetsStackParamList, 'RepairForm'>;

const RepairFormScreen: React.FC = () => {
  const route = useRoute<Rt>();
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const toast = useToast();
  const { assetId, recordId } = route.params;

  const [occurredDate, setOccurredDate] = useState(todayStr());
  const [symptom, setSymptom] = useState('');
  const [cause, setCause] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [cost, setCost] = useState('');
  const [usedWarranty, setUsedWarranty] = useState(false);
  const [completedDate, setCompletedDate] = useState('');
  const [status, setStatus] = useState<string>('pending');
  const [photoUrl, setPhotoUrl] = useState('');
  const [estimateUrl, setEstimateUrl] = useState('');
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [memo, setMemo] = useState('');

  const assetQuery = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => fetchAsset(assetId),
    enabled: !!recordId,
  });

  useEffect(() => {
    navigation.setOptions({ title: recordId ? '修理履歴 編集' : '修理履歴 追加' });
  }, [recordId, navigation]);

  useEffect(() => {
    if (recordId && assetQuery.data) {
      const r = assetQuery.data.repairRecords.find((x) => x.id === recordId);
      if (r) {
        setOccurredDate(r.occurredDate);
        setSymptom(r.symptom ?? '');
        setCause(r.cause ?? '');
        setActionTaken(r.actionTaken ?? '');
        setVendorName(r.vendorName ?? '');
        setTicketNumber(r.ticketNumber ?? '');
        setEstimatedCost(r.estimatedCost == null ? '' : String(r.estimatedCost));
        setCost(r.cost == null ? '' : String(r.cost));
        setUsedWarranty(r.usedWarranty);
        setCompletedDate(r.completedDate ?? '');
        setStatus(r.status);
        setPhotoUrl(r.photoUrl ?? '');
        setEstimateUrl(r.estimateUrl ?? '');
        setInvoiceUrl(r.invoiceUrl ?? '');
        setMemo(r.memo ?? '');
      }
    }
  }, [recordId, assetQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const input = {
        occurredDate,
        symptom: symptom || null,
        cause: cause || null,
        actionTaken: actionTaken || null,
        vendorName: vendorName || null,
        ticketNumber: ticketNumber || null,
        estimatedCost: estimatedCost || undefined,
        cost: cost || undefined,
        usedWarranty,
        completedDate: completedDate || undefined,
        status: status as any,
        photoUrl: photoUrl || undefined,
        estimateUrl: estimateUrl || undefined,
        invoiceUrl: invoiceUrl || undefined,
        memo: memo || null,
      };
      if (recordId) return updateRepair(recordId, input as any);
      return createRepair(assetId, input as any);
    },
    onSuccess: () => {
      invalidateAssetRelated(qc, assetId);
      toast.show(recordId ? '更新しました' : '追加しました');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('保存失敗', e?.response?.data?.message ?? String(e)),
  });

  const onSubmit = () => {
    if (!occurredDate) {
      Alert.alert('入力エラー', '発生日を入力してください');
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
        <DateField label="発生日 *" value={occurredDate} onChange={setOccurredDate} />
        <ChipSelector
          label="ステータス"
          options={REPAIR_STATUSES.map((s) => ({ value: s, label: REPAIR_STATUS_LABELS[s] }))}
          value={status}
          onChange={(v) => v && setStatus(v)}
        />
        <TextField label="症状" value={symptom} onChangeText={setSymptom} multiline />
        <TextField label="原因" value={cause} onChangeText={setCause} multiline />
        <TextField label="対応内容" value={actionTaken} onChangeText={setActionTaken} multiline />
        <TextField label="修理・施工業者" value={vendorName} onChangeText={setVendorName} />
        <TextField label="受付番号" value={ticketNumber} onChangeText={setTicketNumber} />
        <TextField
          label="見積金額"
          value={estimatedCost}
          onChangeText={setEstimatedCost}
          keyboardType="numeric"
        />
        <TextField label="実際の費用" value={cost} onChangeText={setCost} keyboardType="numeric" />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>保証利用</Text>
          <Switch
            value={usedWarranty}
            onValueChange={setUsedWarranty}
            trackColor={{ true: COLORS.primaryLight, false: COLORS.border }}
            thumbColor={usedWarranty ? COLORS.primary : '#fff'}
          />
        </View>
        <DateField label="完了日" value={completedDate} onChange={setCompletedDate} />
        <TextField
          label="関連写真URL"
          value={photoUrl}
          onChangeText={setPhotoUrl}
          autoCapitalize="none"
        />
        <TextField
          label="見積書URL"
          value={estimateUrl}
          onChangeText={setEstimateUrl}
          autoCapitalize="none"
        />
        <TextField
          label="請求書URL"
          value={invoiceUrl}
          onChangeText={setInvoiceUrl}
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  switchLabel: { fontSize: 14, color: COLORS.textSub, fontWeight: '600' },
});

export default RepairFormScreen;
