import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { Section } from '../../components/Section';
import { ChipSelector } from '../../components/ChipSelector';
import { COLORS, SPACING } from '../../theme';
import { upsertActionPlan, deleteActionPlan } from '../../api/actionPlans';
import { fetchAsset } from '../../api/assets';
import { invalidateAssetPlans } from '../../lib/invalidate';
import { confirmDestructive } from '../../lib/confirm';
import { useToast } from '../../components/Toast';
import type { AssetsStackParamList } from '../../navigation/types';

type Rt = RouteProp<AssetsStackParamList, 'ActionPlanForm'>;

const PRIORITY_OPTIONS = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

const ActionPlanFormScreen: React.FC = () => {
  const route = useRoute<Rt>();
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const toast = useToast();
  const { assetId } = route.params;

  const [managementPolicy, setManagementPolicy] = useState('');
  const [actionPhase, setActionPhase] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [professionalTrigger, setProfessionalTrigger] = useState('');
  const [estimateTiming, setEstimateTiming] = useState('');
  const [replacementDecisionTiming, setReplacementDecisionTiming] = useState('');
  const [replacementYearFrom, setReplacementYearFrom] = useState('');
  const [replacementYearTo, setReplacementYearTo] = useState('');
  const [replacementStatus, setReplacementStatus] = useState('');
  const [replacementCostMin, setReplacementCostMin] = useState('');
  const [replacementCostMax, setReplacementCostMax] = useState('');
  const [routineCostMin, setRoutineCostMin] = useState('');
  const [routineCostMax, setRoutineCostMax] = useState('');
  const [professionalCostMin, setProfessionalCostMin] = useState('');
  const [professionalCostMax, setProfessionalCostMax] = useState('');
  const [baselineYear, setBaselineYear] = useState('');
  const [priority, setPriority] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  // 出所（手編集時も保持）
  const [existingSource, setExistingSource] = useState<string | null>(null);
  const [existingSchemaVersion, setExistingSchemaVersion] = useState<string | null>(null);
  const [existingGeneratedAt, setExistingGeneratedAt] = useState<string | null>(null);
  const [hasPlan, setHasPlan] = useState(false);

  const assetQuery = useQuery({ queryKey: ['asset', assetId], queryFn: () => fetchAsset(assetId) });

  useEffect(() => {
    const p = assetQuery.data?.actionPlan;
    if (!p) return;
    setHasPlan(true);
    setManagementPolicy(p.managementPolicy ?? '');
    setActionPhase(p.actionPhase ?? '');
    setNextAction(p.nextAction ?? '');
    setProfessionalTrigger(p.professionalTrigger ?? '');
    setEstimateTiming(p.estimateTiming ?? '');
    setReplacementDecisionTiming(p.replacementDecisionTiming ?? '');
    setReplacementYearFrom(p.replacementYearFrom == null ? '' : String(p.replacementYearFrom));
    setReplacementYearTo(p.replacementYearTo == null ? '' : String(p.replacementYearTo));
    setReplacementStatus(p.replacementStatus ?? '');
    setReplacementCostMin(p.replacementCostMin == null ? '' : String(p.replacementCostMin));
    setReplacementCostMax(p.replacementCostMax == null ? '' : String(p.replacementCostMax));
    setRoutineCostMin(p.routineCostMin == null ? '' : String(p.routineCostMin));
    setRoutineCostMax(p.routineCostMax == null ? '' : String(p.routineCostMax));
    setProfessionalCostMin(p.professionalCostMin == null ? '' : String(p.professionalCostMin));
    setProfessionalCostMax(p.professionalCostMax == null ? '' : String(p.professionalCostMax));
    setBaselineYear(p.baselineYear == null ? '' : String(p.baselineYear));
    setPriority(p.priority);
    setNotesText((p.notes ?? []).join('\n'));
    setExistingSource(p.source);
    setExistingSchemaVersion(p.schemaVersion);
    setExistingGeneratedAt(p.generatedAt);
  }, [assetQuery.data]);

  const invalidate = () => invalidateAssetPlans(qc, assetId);

  const mutation = useMutation({
    mutationFn: () =>
      upsertActionPlan(assetId, {
        managementPolicy: managementPolicy || undefined,
        actionPhase: actionPhase || undefined,
        nextAction: nextAction || undefined,
        professionalTrigger: professionalTrigger || undefined,
        estimateTiming: estimateTiming || undefined,
        replacementDecisionTiming: replacementDecisionTiming || undefined,
        replacementYearFrom: replacementYearFrom || undefined,
        replacementYearTo: replacementYearTo || undefined,
        replacementStatus: replacementStatus || undefined,
        replacementCostMin: replacementCostMin || undefined,
        replacementCostMax: replacementCostMax || undefined,
        routineCostMin: routineCostMin || undefined,
        routineCostMax: routineCostMax || undefined,
        professionalCostMin: professionalCostMin || undefined,
        professionalCostMax: professionalCostMax || undefined,
        baselineYear: baselineYear || undefined,
        priority: priority || undefined,
        notes: notesText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        // 出所は保持（無ければ手編集として manual）
        source: existingSource ?? 'manual',
        schemaVersion: existingSchemaVersion ?? undefined,
        generatedAt: existingGeneratedAt ?? undefined,
      } as any),
    onSuccess: () => {
      invalidate();
      toast.show('保存しました');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('保存失敗', e?.response?.data?.message ?? String(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteActionPlan(assetId),
    onSuccess: () => {
      invalidate();
      toast.show('削除しました');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('削除失敗', e?.response?.data?.message ?? String(e)),
  });

  const confirmDelete = () =>
    confirmDestructive({
      title: 'メンテ計画を削除',
      message: 'この資産のメンテ計画を削除します。よろしいですか？',
      onConfirm: () => deleteMutation.mutate(),
    });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Section title="方針・対応">
          <TextField label="方針" value={managementPolicy} onChangeText={setManagementPolicy} />
          <TextField label="段階" value={actionPhase} onChangeText={setActionPhase} />
          <TextField label="次にやること" value={nextAction} onChangeText={setNextAction} multiline />
          <TextField
            label="業者相談トリガー"
            value={professionalTrigger}
            onChangeText={setProfessionalTrigger}
            multiline
          />
        </Section>

        <Section title="見積・更新判断">
          <TextField
            label="見積タイミング"
            value={estimateTiming}
            onChangeText={setEstimateTiming}
            multiline
          />
          <TextField
            label="更新判断の条件"
            value={replacementDecisionTiming}
            onChangeText={setReplacementDecisionTiming}
            multiline
          />
          <TextField
            label="更新予定 年(From)"
            value={replacementYearFrom}
            onChangeText={setReplacementYearFrom}
            keyboardType="numeric"
          />
          <TextField
            label="更新予定 年(To)"
            value={replacementYearTo}
            onChangeText={setReplacementYearTo}
            keyboardType="numeric"
          />
          <TextField
            label="ステータス"
            value={replacementStatus}
            onChangeText={setReplacementStatus}
            placeholder="当面はセルフ管理 など"
          />
        </Section>

        <Section title="費用（概算・円）">
          <TextField
            label="更新費 最小"
            value={replacementCostMin}
            onChangeText={setReplacementCostMin}
            keyboardType="numeric"
          />
          <TextField
            label="更新費 最大"
            value={replacementCostMax}
            onChangeText={setReplacementCostMax}
            keyboardType="numeric"
          />
          <TextField
            label="通常メンテ費 最小"
            value={routineCostMin}
            onChangeText={setRoutineCostMin}
            keyboardType="numeric"
          />
          <TextField
            label="通常メンテ費 最大"
            value={routineCostMax}
            onChangeText={setRoutineCostMax}
            keyboardType="numeric"
          />
          <TextField
            label="業者費 最小"
            value={professionalCostMin}
            onChangeText={setProfessionalCostMin}
            keyboardType="numeric"
          />
          <TextField
            label="業者費 最大"
            value={professionalCostMax}
            onChangeText={setProfessionalCostMax}
            keyboardType="numeric"
          />
        </Section>

        <Section title="その他">
          <TextField
            label="基準年"
            value={baselineYear}
            onChangeText={setBaselineYear}
            keyboardType="numeric"
          />
          <ChipSelector
            label="計画の優先度"
            options={PRIORITY_OPTIONS}
            value={priority}
            onChange={setPriority}
            allowClear
          />
          <TextField
            label="補足（1行に1項目）"
            value={notesText}
            onChangeText={setNotesText}
            multiline
            helper="改行ごとに1つの補足として保存します"
          />
        </Section>

        <Button title="保存する" onPress={() => mutation.mutate()} loading={mutation.isPending} />
        {hasPlan ? (
          <Button title="この計画を削除" onPress={confirmDelete} variant="danger" />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, backgroundColor: COLORS.bg, paddingBottom: SPACING.xxl },
});

export default ActionPlanFormScreen;
