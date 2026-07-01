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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { DateField } from '../../components/DateField';
import { ChipSelector } from '../../components/ChipSelector';
import { Section } from '../../components/Section';
import { COLORS, SPACING } from '../../theme';
import { createAsset, fetchAsset, updateAsset } from '../../api/assets';
import { fetchCategories, fetchLocations } from '../../api/master';
import { invalidateAssetRelated } from '../../lib/invalidate';
import { useToast } from '../../components/Toast';
import {
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  ASSET_PRIORITIES,
  ASSET_PRIORITY_LABELS,
  assetInputSchema,
  type AssetInput,
} from '@homeasset/shared';
import type { AssetsStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AssetsStackParamList, 'AssetForm'>;
type Rt = RouteProp<AssetsStackParamList, 'AssetForm'>;

// zod の fieldErrors（{key: string[]}）を {key: string} に畳む
const flattenFieldErrors = (
  fe: Record<string, string[] | undefined>
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const k of Object.keys(fe)) {
    const arr = fe[k];
    if (arr && arr.length > 0) out[k] = arr[0];
  }
  return out;
};

const AssetFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const assetId = route.params?.assetId;
  const qc = useQueryClient();
  const toast = useToast();

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const locationsQuery = useQuery({ queryKey: ['locations'], queryFn: fetchLocations });

  const existingQuery = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => fetchAsset(assetId!),
    enabled: !!assetId,
  });

  const [form, setForm] = useState<AssetInput>({
    name: '',
    assetType: 'device',
    status: 'active',
    priority: 'medium',
  } as AssetInput);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    navigation.setOptions({ title: assetId ? '資産編集' : '資産登録' });
  }, [assetId, navigation]);

  useEffect(() => {
    if (existingQuery.data) {
      const d = existingQuery.data;
      setForm({
        name: d.name,
        assetType: d.assetType as any,
        categoryId: d.categoryId,
        manufacturer: d.manufacturer ?? undefined,
        modelNumber: d.modelNumber ?? undefined,
        serialNumber: d.serialNumber ?? undefined,
        locationId: d.locationId,
        status: d.status as any,
        priority: d.priority as any,
        purchaseDate: d.purchaseDate ?? undefined,
        installedDate: d.installedDate ?? undefined,
        constructionDate: d.constructionDate ?? undefined,
        purchaseStore: d.purchaseStore ?? undefined,
        contractorName: d.contractorName ?? undefined,
        contractorContact: d.contractorContact ?? undefined,
        contactPerson: d.contactPerson ?? undefined,
        purchasePrice: d.purchasePrice ?? undefined,
        constructionCost: d.constructionCost ?? undefined,
        purchaseUrl: d.purchaseUrl ?? undefined,
        orderNumber: d.orderNumber ?? undefined,
        contractNumber: d.contractNumber ?? undefined,
        receiptUrl: d.receiptUrl ?? undefined,
        constructionDocumentUrl: d.constructionDocumentUrl ?? undefined,
        warrantyStartDate: d.warrantyStartDate ?? undefined,
        warrantyEndDate: d.warrantyEndDate ?? undefined,
        hasExtendedWarranty: d.hasExtendedWarranty,
        warrantyMemo: d.warrantyMemo ?? undefined,
        manualUrl: d.manualUrl ?? undefined,
        supportUrl: d.supportUrl ?? undefined,
        officialUrl: d.officialUrl ?? undefined,
        photoUrl: d.photoUrl ?? undefined,
        labelPhotoUrl: d.labelPhotoUrl ?? undefined,
        beforePhotoUrl: d.beforePhotoUrl ?? undefined,
        afterPhotoUrl: d.afterPhotoUrl ?? undefined,
        expectedLifespanYears: d.expectedLifespanYears ?? undefined,
        replacementDueDate: d.replacementDueDate ?? undefined,
        memo: d.memo ?? undefined,
      } as AssetInput);
    }
  }, [existingQuery.data]);

  const mutation = useMutation({
    mutationFn: async (input: AssetInput) => {
      if (assetId) return updateAsset(assetId, input);
      return createAsset(input);
    },
    onSuccess: (data) => {
      invalidateAssetRelated(qc, assetId);
      toast.show(assetId ? '更新しました' : '登録しました');
      if (assetId) {
        navigation.goBack();
      } else {
        navigation.replace('AssetDetail', { assetId: data.id });
      }
    },
    onError: (e: any) => {
      // サーバ検証エラーを項目ごとに表示
      const fe = e?.response?.data?.errors?.fieldErrors;
      if (fe && typeof fe === 'object') {
        const mapped = flattenFieldErrors(fe);
        if (Object.keys(mapped).length > 0) {
          setErrors(mapped);
          Alert.alert('入力エラー', '赤字の項目を確認してください');
          return;
        }
      }
      Alert.alert('保存失敗', e?.response?.data?.message ?? String(e));
    },
  });

  const set = <K extends keyof AssetInput>(key: K, value: AssetInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const onSubmit = () => {
    // 共有スキーマで項目ごとに検証
    const result = assetInputSchema.safeParse(form);
    if (!result.success) {
      setErrors(flattenFieldErrors(result.error.flatten().fieldErrors as any));
      Alert.alert('入力エラー', '赤字の項目を確認してください');
      return;
    }
    setErrors({});
    mutation.mutate(form);
  };

  // 管理対象種別でフィルタしたカテゴリ
  const filteredCategories = (categoriesQuery.data ?? []).filter(
    (c) => !c.assetType || c.assetType === form.assetType
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Section title="基本情報">
          <TextField
            label="名称 *"
            value={form.name}
            onChangeText={(v) => set('name', v)}
            placeholder="例: リビングのテレビ／外壁／給湯器"
            error={errors.name}
          />
          <ChipSelector
            label="管理対象種別"
            options={ASSET_TYPES.map((t) => ({ value: t, label: ASSET_TYPE_LABELS[t] }))}
            value={form.assetType}
            onChange={(v) => v && set('assetType', v as any)}
          />
          <ChipSelector
            label="カテゴリ"
            options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))}
            value={form.categoryId ?? null}
            onChange={(v) => set('categoryId', v)}
            allowClear
          />
          <TextField
            label="メーカー"
            value={form.manufacturer ?? ''}
            onChangeText={(v) => set('manufacturer', v)}
            error={errors.manufacturer}
          />
          <TextField
            label="型番"
            value={form.modelNumber ?? ''}
            onChangeText={(v) => set('modelNumber', v)}
            error={errors.modelNumber}
          />
          <TextField
            label="シリアル番号"
            value={form.serialNumber ?? ''}
            onChangeText={(v) => set('serialNumber', v)}
            error={errors.serialNumber}
          />
          <ChipSelector
            label="設置場所"
            options={(locationsQuery.data ?? []).map((l) => ({ value: l.id, label: l.name }))}
            value={form.locationId ?? null}
            onChange={(v) => set('locationId', v)}
            allowClear
          />
          <ChipSelector
            label="ステータス"
            options={ASSET_STATUSES.map((s) => ({ value: s, label: ASSET_STATUS_LABELS[s] }))}
            value={form.status}
            onChange={(v) => v && set('status', v as any)}
          />
          <ChipSelector
            label="優先度"
            options={ASSET_PRIORITIES.map((s) => ({ value: s, label: ASSET_PRIORITY_LABELS[s] }))}
            value={form.priority}
            onChange={(v) => v && set('priority', v as any)}
          />
        </Section>

        <Section title="購入・設置・施工" collapsible defaultCollapsed>
          <DateField
            label="購入日"
            value={form.purchaseDate ?? ''}
            onChange={(v) => set('purchaseDate', v)}
            error={errors.purchaseDate}
          />
          <DateField
            label="設置日"
            value={form.installedDate ?? ''}
            onChange={(v) => set('installedDate', v)}
            error={errors.installedDate}
          />
          <DateField
            label="施工日"
            value={form.constructionDate ?? ''}
            onChange={(v) => set('constructionDate', v)}
            error={errors.constructionDate}
          />
          <TextField
            label="購入店舗"
            value={form.purchaseStore ?? ''}
            onChangeText={(v) => set('purchaseStore', v)}
            error={errors.purchaseStore}
          />
          <TextField
            label="施工業者"
            value={form.contractorName ?? ''}
            onChangeText={(v) => set('contractorName', v)}
            error={errors.contractorName}
          />
          <TextField
            label="施工業者連絡先"
            value={form.contractorContact ?? ''}
            onChangeText={(v) => set('contractorContact', v)}
            error={errors.contractorContact}
          />
          <TextField
            label="担当者名"
            value={form.contactPerson ?? ''}
            onChangeText={(v) => set('contactPerson', v)}
            error={errors.contactPerson}
          />
          <TextField
            label="購入価格 (円)"
            value={form.purchasePrice == null ? '' : String(form.purchasePrice)}
            onChangeText={(v) => set('purchasePrice', v as any)}
            keyboardType="numeric"
            error={errors.purchasePrice}
          />
          <TextField
            label="施工費用 (円)"
            value={form.constructionCost == null ? '' : String(form.constructionCost)}
            onChangeText={(v) => set('constructionCost', v as any)}
            keyboardType="numeric"
            error={errors.constructionCost}
          />
          <TextField
            label="購入ページURL"
            value={form.purchaseUrl ?? ''}
            onChangeText={(v) => set('purchaseUrl', v)}
            autoCapitalize="none"
            error={errors.purchaseUrl}
          />
          <TextField
            label="注文番号"
            value={form.orderNumber ?? ''}
            onChangeText={(v) => set('orderNumber', v)}
            error={errors.orderNumber}
          />
          <TextField
            label="契約番号"
            value={form.contractNumber ?? ''}
            onChangeText={(v) => set('contractNumber', v)}
            error={errors.contractNumber}
          />
          <TextField
            label="レシート・領収書URL"
            value={form.receiptUrl ?? ''}
            onChangeText={(v) => set('receiptUrl', v)}
            autoCapitalize="none"
            error={errors.receiptUrl}
          />
          <TextField
            label="施工資料URL"
            value={form.constructionDocumentUrl ?? ''}
            onChangeText={(v) => set('constructionDocumentUrl', v)}
            autoCapitalize="none"
            error={errors.constructionDocumentUrl}
          />
        </Section>

        <Section title="保証情報" collapsible defaultCollapsed>
          <DateField
            label="保証開始日"
            value={form.warrantyStartDate ?? ''}
            onChange={(v) => set('warrantyStartDate', v)}
            error={errors.warrantyStartDate}
          />
          <DateField
            label="保証終了日"
            value={form.warrantyEndDate ?? ''}
            onChange={(v) => set('warrantyEndDate', v)}
            error={errors.warrantyEndDate}
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>延長保証あり</Text>
            <Switch
              value={form.hasExtendedWarranty ?? false}
              onValueChange={(v) => set('hasExtendedWarranty', v)}
              trackColor={{ true: COLORS.primaryLight, false: COLORS.border }}
              thumbColor={form.hasExtendedWarranty ? COLORS.primary : '#fff'}
            />
          </View>
          <TextField
            label="保証メモ"
            value={form.warrantyMemo ?? ''}
            onChangeText={(v) => set('warrantyMemo', v)}
            multiline
            error={errors.warrantyMemo}
          />
        </Section>

        <Section title="取扱説明書・サポート・写真" collapsible defaultCollapsed>
          <TextField
            label="取扱説明書URL"
            value={form.manualUrl ?? ''}
            onChangeText={(v) => set('manualUrl', v)}
            autoCapitalize="none"
            error={errors.manualUrl}
          />
          <TextField
            label="メーカー公式ページURL"
            value={form.officialUrl ?? ''}
            onChangeText={(v) => set('officialUrl', v)}
            autoCapitalize="none"
            error={errors.officialUrl}
          />
          <TextField
            label="サポートページURL"
            value={form.supportUrl ?? ''}
            onChangeText={(v) => set('supportUrl', v)}
            autoCapitalize="none"
            error={errors.supportUrl}
          />
          <TextField
            label="写真URL"
            value={form.photoUrl ?? ''}
            onChangeText={(v) => set('photoUrl', v)}
            autoCapitalize="none"
            error={errors.photoUrl}
          />
          <TextField
            label="型番ラベル写真URL"
            value={form.labelPhotoUrl ?? ''}
            onChangeText={(v) => set('labelPhotoUrl', v)}
            autoCapitalize="none"
            error={errors.labelPhotoUrl}
          />
          <TextField
            label="施工前写真URL"
            value={form.beforePhotoUrl ?? ''}
            onChangeText={(v) => set('beforePhotoUrl', v)}
            autoCapitalize="none"
            error={errors.beforePhotoUrl}
          />
          <TextField
            label="施工後写真URL"
            value={form.afterPhotoUrl ?? ''}
            onChangeText={(v) => set('afterPhotoUrl', v)}
            autoCapitalize="none"
            error={errors.afterPhotoUrl}
          />
        </Section>

        <Section title="寿命・交換予定" collapsible defaultCollapsed>
          <TextField
            label="想定寿命 (年)"
            value={form.expectedLifespanYears == null ? '' : String(form.expectedLifespanYears)}
            onChangeText={(v) => set('expectedLifespanYears', v as any)}
            keyboardType="numeric"
            error={errors.expectedLifespanYears}
          />
          <DateField
            label="交換予定日"
            value={form.replacementDueDate ?? ''}
            onChange={(v) => set('replacementDueDate', v)}
            error={errors.replacementDueDate}
          />
        </Section>

        <Section title="メモ" collapsible defaultCollapsed>
          <TextField
            label="自由メモ"
            value={form.memo ?? ''}
            onChangeText={(v) => set('memo', v)}
            multiline
            error={errors.memo}
          />
        </Section>

        <Button
          title={assetId ? '更新する' : '登録する'}
          onPress={onSubmit}
          loading={mutation.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, backgroundColor: COLORS.bg, paddingBottom: SPACING.xxl },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  switchLabel: { fontSize: 14, color: COLORS.textSub, fontWeight: '600' },
});

export default AssetFormScreen;
