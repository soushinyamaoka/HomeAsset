import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { DateField } from '../../components/DateField';
import { COLORS, SPACING } from '../../theme';
import { createConsumable, updateConsumable } from '../../api/children';
import { fetchAsset } from '../../api/assets';
import { invalidateAssetRelated } from '../../lib/invalidate';
import { useToast } from '../../components/Toast';
import type { AssetsStackParamList } from '../../navigation/types';

type Rt = RouteProp<AssetsStackParamList, 'ConsumableForm'>;

const ConsumableFormScreen: React.FC = () => {
  const route = useRoute<Rt>();
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const toast = useToast();
  const { assetId, consumableId } = route.params;

  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [replacementIntervalText, setReplacementIntervalText] = useState('');
  const [lastReplacedDate, setLastReplacedDate] = useState('');
  const [nextReplacementDate, setNextReplacementDate] = useState('');
  const [purchaseUrl, setPurchaseUrl] = useState('');
  const [memo, setMemo] = useState('');

  const assetQuery = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => fetchAsset(assetId),
    enabled: !!consumableId,
  });

  useEffect(() => {
    navigation.setOptions({ title: consumableId ? '消耗品 編集' : '消耗品 追加' });
  }, [consumableId, navigation]);

  useEffect(() => {
    if (consumableId && assetQuery.data) {
      const c = assetQuery.data.consumables.find((x) => x.id === consumableId);
      if (c) {
        setName(c.name);
        setManufacturer(c.manufacturer ?? '');
        setModelNumber(c.modelNumber ?? '');
        setReplacementIntervalText(c.replacementIntervalText ?? '');
        setLastReplacedDate(c.lastReplacedDate ?? '');
        setNextReplacementDate(c.nextReplacementDate ?? '');
        setPurchaseUrl(c.purchaseUrl ?? '');
        setMemo(c.memo ?? '');
      }
    }
  }, [consumableId, assetQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const input = {
        name: name.trim(),
        manufacturer: manufacturer || null,
        modelNumber: modelNumber || null,
        replacementIntervalText: replacementIntervalText || null,
        lastReplacedDate: lastReplacedDate || undefined,
        nextReplacementDate: nextReplacementDate || undefined,
        purchaseUrl: purchaseUrl || undefined,
        memo: memo || null,
      };
      if (consumableId) return updateConsumable(consumableId, input as any);
      return createConsumable(assetId, input as any);
    },
    onSuccess: () => {
      invalidateAssetRelated(qc, assetId);
      toast.show(consumableId ? '更新しました' : '追加しました');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('保存失敗', e?.response?.data?.message ?? String(e)),
  });

  const onSubmit = () => {
    if (!name.trim()) {
      Alert.alert('入力エラー', '消耗品名を入力してください');
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
        <TextField
          label="消耗品名 *"
          value={name}
          onChangeText={setName}
          placeholder="例: 空気清浄機フィルター"
        />
        <TextField label="メーカー" value={manufacturer} onChangeText={setManufacturer} />
        <TextField label="型番" value={modelNumber} onChangeText={setModelNumber} />
        <TextField
          label="交換目安"
          value={replacementIntervalText}
          onChangeText={setReplacementIntervalText}
          placeholder="例: 1年"
        />
        <DateField label="最終交換日" value={lastReplacedDate} onChange={setLastReplacedDate} />
        <DateField
          label="次回交換予定日"
          value={nextReplacementDate}
          onChange={setNextReplacementDate}
        />
        <TextField
          label="購入URL"
          value={purchaseUrl}
          onChangeText={setPurchaseUrl}
          autoCapitalize="none"
        />
        <TextField label="メモ" value={memo} onChangeText={setMemo} multiline />
        <Button
          title={consumableId ? '更新する' : '追加する'}
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

export default ConsumableFormScreen;
