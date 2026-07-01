import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { Card } from '../../components/Card';
import { Section } from '../../components/Section';
import { COLORS, SPACING } from '../../theme';
import { fetchAsset } from '../../api/assets';
import { upsertActionPlan } from '../../api/actionPlans';
import { invalidateAssetPlans } from '../../lib/invalidate';
import { useToast } from '../../components/Toast';
import { buildActionPlanPrompt, actionPlanAiSchema } from '@homeasset/shared';
import type { AssetsStackParamList } from '../../navigation/types';

type Rt = RouteProp<AssetsStackParamList, 'AiActionPlanForm'>;
type Parsed = ReturnType<typeof actionPlanAiSchema.parse>;

const AiActionPlanScreen: React.FC = () => {
  const route = useRoute<Rt>();
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const toast = useToast();
  const { assetId } = route.params;

  const [rawJson, setRawJson] = useState('');
  const [preview, setPreview] = useState<Parsed | null>(null);

  const assetQuery = useQuery({ queryKey: ['asset', assetId], queryFn: () => fetchAsset(assetId) });
  const d = assetQuery.data;

  const prompt = useMemo(() => {
    if (!d) return '';
    return buildActionPlanPrompt({
      id: d.id,
      name: d.name,
      assetType: d.assetType,
      category: d.category?.name ?? null,
      location: d.location?.name ?? null,
      manufacturer: d.manufacturer,
      modelNumber: d.modelNumber,
      purchaseDate: d.purchaseDate,
      installedDate: d.installedDate,
      constructionDate: d.constructionDate,
      priority: d.priority,
      memo: d.memo,
      specs: d.specs.map((s) => ({ name: s.specName, value: s.specValue, unit: s.unit })),
    });
  }, [d]);

  const copyPrompt = async () => {
    await Clipboard.setStringAsync(prompt);
    Alert.alert('コピーしました', 'ChatGPT / Claude / Gemini などに貼り付けてください');
  };

  const parse = () => {
    let json: unknown;
    try {
      json = JSON.parse(rawJson);
    } catch (e) {
      Alert.alert('解析失敗', 'JSONとして読み取れませんでした。AIの回答をそのまま貼り付けてください。');
      return;
    }
    const result = actionPlanAiSchema.safeParse(json);
    if (!result.success) {
      Alert.alert('構造が不正です', result.error.issues[0]?.message ?? '想定した構造ではありません');
      return;
    }
    if (result.data.assetIdHint && result.data.assetIdHint !== assetId) {
      Alert.alert(
        '確認',
        'JSON内の asset_id がこの資産と異なります。別の資産向けの計画の可能性があります。このまま登録すると、この資産に保存されます。'
      );
    }
    setPreview(result.data);
  };

  const registerMutation = useMutation({
    mutationFn: () => upsertActionPlan(assetId, preview as any),
    onSuccess: () => {
      invalidateAssetPlans(qc, assetId);
      toast.show('メンテ計画を登録しました');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('登録失敗', e?.response?.data?.message ?? String(e)),
  });

  if (assetQuery.isLoading || !d) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const cost = (min?: number, max?: number) => {
    if (min == null && max == null) return '—';
    const f = (n: number) => `¥${n.toLocaleString()}`;
    if (min != null && max != null) return min === max ? f(min) : `${f(min)}〜${f(max)}`;
    return f((min ?? max) as number);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Section title={`1. プロンプト生成（${d.name}）`}>
          <Card>
            <Text style={styles.promptText} numberOfLines={10}>
              {prompt}
            </Text>
            <Button
              title="プロンプトをコピー"
              onPress={copyPrompt}
              icon={<Ionicons name="copy" size={16} color="#fff" />}
            />
          </Card>
        </Section>

        <Section title="2. AI回答JSONを貼り付け">
          <TextField
            label="AIからの回答（JSON）"
            value={rawJson}
            onChangeText={setRawJson}
            multiline
            style={{ minHeight: 180 }}
            placeholder='{"management_policy": ..., "replacement_window": {...}, ...}'
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button title="解析してプレビュー" onPress={parse} variant="outline" />
        </Section>

        {preview ? (
          <Section title="3. プレビュー">
            <Card>
              <PreviewRow label="方針" value={preview.managementPolicy} />
              <PreviewRow label="段階" value={preview.actionPhase} />
              <PreviewRow label="次にやること" value={preview.nextAction} />
              <PreviewRow label="業者相談トリガー" value={preview.professionalTrigger} />
              <PreviewRow label="見積タイミング" value={preview.estimateTiming} />
              <PreviewRow label="更新判断" value={preview.replacementDecisionTiming} />
              <PreviewRow
                label="更新予定"
                value={
                  preview.replacementYearFrom || preview.replacementYearTo
                    ? `${preview.replacementYearFrom ?? '—'}〜${preview.replacementYearTo ?? '—'}年` +
                      (preview.replacementStatus ? `（${preview.replacementStatus}）` : '')
                    : undefined
                }
              />
              <PreviewRow label="更新費" value={cost(preview.replacementCostMin, preview.replacementCostMax)} />
              <PreviewRow label="通常メンテ費" value={cost(preview.routineCostMin, preview.routineCostMax)} />
              <PreviewRow label="業者費" value={cost(preview.professionalCostMin, preview.professionalCostMax)} />
              <PreviewRow label="優先度" value={preview.priority} />
              <PreviewRow label="補足" value={preview.notes?.length ? `${preview.notes.length}件` : undefined} />
            </Card>
            <Button
              title="この内容でメンテ計画を登録"
              onPress={() => registerMutation.mutate()}
              loading={registerMutation.isPending}
            />
            <Text style={styles.note}>※ 既にメンテ計画がある場合は上書き（upsert）されます。</Text>
          </Section>
        ) : null}
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const PreviewRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) =>
  value ? (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  ) : null;

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, backgroundColor: COLORS.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  promptText: {
    backgroundColor: '#FAFAFA',
    padding: SPACING.sm,
    borderRadius: 8,
    fontSize: 12,
    color: COLORS.textSub,
    marginBottom: SPACING.sm,
  },
  row: { flexDirection: 'row', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { width: 110, color: COLORS.textSub, fontSize: 13 },
  rowValue: { flex: 1, color: COLORS.text, fontSize: 14 },
  note: { color: COLORS.textMuted, fontSize: 12, marginTop: SPACING.sm },
});

export default AiActionPlanScreen;
