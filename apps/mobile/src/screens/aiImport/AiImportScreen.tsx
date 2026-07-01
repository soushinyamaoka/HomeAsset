import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
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
import { ChipSelector } from '../../components/ChipSelector';
import { COLORS, RADIUS, SPACING } from '../../theme';
import { applyAiImport, createAndApplyAiImport, parseAiImport } from '../../api/aiImport';
import { fetchAssets, fetchAsset } from '../../api/assets';
import { invalidateAssetRelated } from '../../lib/invalidate';
import { fetchCategories, fetchLocations } from '../../api/master';
import {
  buildAiResearchPrompt,
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  type AiImportPayload,
} from '@homeasset/shared';
import type { AssetsStackParamList, AiImportStackParamList } from '../../navigation/types';

type Mode = 'create' | 'apply';
type Rt = RouteProp<AssetsStackParamList & AiImportStackParamList, any>;

const AiImportScreen: React.FC = () => {
  const route = useRoute<Rt>();
  const navigation = useNavigation<any>();
  const qc = useQueryClient();

  const initialAssetId = (route.params as any)?.assetId ?? null;

  const [mode, setMode] = useState<Mode>(initialAssetId ? 'apply' : 'create');
  const [targetAssetId, setTargetAssetId] = useState<string | null>(initialAssetId);

  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState<string>('device');
  const [manufacturer, setManufacturer] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [category, setCategory] = useState('');
  const [rawJson, setRawJson] = useState('');

  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [newLocationId, setNewLocationId] = useState<string | null>(null);

  const [previewPayload, setPreviewPayload] = useState<AiImportPayload | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [applySpecs, setApplySpecs] = useState(true);
  const [applyLinks, setApplyLinks] = useState(true);
  const [applyConsumables, setApplyConsumables] = useState(true);
  const [applyAccessories, setApplyAccessories] = useState(true);

  const assetsQuery = useQuery({ queryKey: ['assets', 'all'], queryFn: () => fetchAssets() });
  const assetQuery = useQuery({
    queryKey: ['asset', targetAssetId],
    queryFn: () => fetchAsset(targetAssetId!),
    enabled: !!targetAssetId,
  });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const locationsQuery = useQuery({ queryKey: ['locations'], queryFn: fetchLocations });

  useEffect(() => {
    if (assetQuery.data) {
      setAssetName(assetQuery.data.name);
      setAssetType(assetQuery.data.assetType);
      setManufacturer(assetQuery.data.manufacturer ?? '');
      setModelNumber(assetQuery.data.modelNumber ?? '');
      setCategory(assetQuery.data.category?.name ?? '');
    }
  }, [assetQuery.data]);

  const prompt = useMemo(
    () =>
      buildAiResearchPrompt({
        assetName: assetName || '【ここに名称】',
        assetType,
        manufacturer,
        modelNumber,
        category,
      }),
    [assetName, assetType, manufacturer, modelNumber, category]
  );

  const copyPrompt = async () => {
    await Clipboard.setStringAsync(prompt);
    Alert.alert('コピーしました', 'ChatGPT/Claude/Geminiに貼り付けてください');
  };

  const resetForm = () => {
    setRawJson('');
    setPreviewPayload(null);
    setAssetName('');
    setManufacturer('');
    setModelNumber('');
    setCategory('');
    setTargetAssetId(null);
    setNewCategoryId(null);
    setNewLocationId(null);
  };

  const parseMutation = useMutation({
    mutationFn: () => parseAiImport(rawJson, targetAssetId ?? undefined),
    onSuccess: (data) => setPreviewPayload(data.payload),
    onError: (e: any) => Alert.alert('解析失敗', e?.response?.data?.message ?? String(e)),
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!targetAssetId) throw new Error('反映対象の資産を選択してください');
      if (!previewPayload) throw new Error('AI回答を解析してください');
      return applyAiImport(targetAssetId, previewPayload, {
        overwrite,
        applySpecs,
        applyLinks,
        applyConsumables,
        applyAccessories,
      });
    },
    onSuccess: (data) => {
      invalidateAssetRelated(qc, targetAssetId ?? undefined);
      Alert.alert(
        '反映しました',
        `基本情報: ${data.counts.assetFieldsUpdated}項目\nスペック: ${data.counts.specsCreated}件\nリンク: ${data.counts.linksCreated}件\n消耗品: ${data.counts.consumablesCreated}件\n付属品: ${data.counts.accessoriesCreated}件`
      );
      resetForm();
      navigation.goBack();
    },
    onError: (e: any) =>
      Alert.alert('反映失敗', e?.response?.data?.message ?? e?.message ?? String(e)),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!previewPayload) throw new Error('AI回答を解析してください');
      const finalName = assetName.trim() || previewPayload.asset?.name?.trim();
      if (!finalName) throw new Error('名称を入力してください');
      return createAndApplyAiImport(
        {
          name: finalName,
          assetType: (previewPayload.asset?.asset_type ?? assetType) as any,
          categoryId: newCategoryId,
          locationId: newLocationId,
        },
        previewPayload,
        { applySpecs, applyLinks, applyConsumables, applyAccessories }
      );
    },
    onSuccess: (data) => {
      invalidateAssetRelated(qc);
      resetForm();
      Alert.alert(
        '作成しました',
        `スペック: ${data.counts.specsCreated}件\nリンク: ${data.counts.linksCreated}件\n消耗品: ${data.counts.consumablesCreated}件\n付属品: ${data.counts.accessoriesCreated}件`,
        [
          {
            text: '詳細を見る',
            onPress: () => {
              navigation.navigate('AssetsTab', {
                screen: 'AssetDetail',
                params: { assetId: data.asset.id },
              } as any);
            },
          },
        ]
      );
    },
    onError: (e: any) =>
      Alert.alert('作成失敗', e?.response?.data?.message ?? e?.message ?? String(e)),
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Section title="1. 取り込み先">
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeChip, mode === 'create' && styles.modeChipActive]}
              onPress={() => {
                setMode('create');
                setTargetAssetId(null);
              }}
            >
              <Text style={[styles.modeChipText, mode === 'create' && styles.modeChipTextActive]}>
                新規作成
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeChip, mode === 'apply' && styles.modeChipActive]}
              onPress={() => setMode('apply')}
            >
              <Text style={[styles.modeChipText, mode === 'apply' && styles.modeChipTextActive]}>
                既存資産に反映
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'apply' ? (
            <Card>
              {targetAssetId ? (
                <View>
                  <Text style={styles.targetName}>{assetQuery.data?.name ?? '...'}</Text>
                  <TouchableOpacity onPress={() => setTargetAssetId(null)}>
                    <Text style={styles.changeText}>変更</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.helperText}>反映先の資産を選択してください</Text>
                  {(assetsQuery.data ?? []).slice(0, 30).map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={styles.assetRow}
                      onPress={() => setTargetAssetId(d.id)}
                    >
                      <Text style={styles.assetRowName}>{d.name}</Text>
                      <Text style={styles.assetRowMeta}>
                        {d.category?.name ?? '未分類'} / {d.manufacturer ?? '—'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>
          ) : (
            <Card>
              <Text style={styles.helperText}>
                AI回答の内容で新しい資産を作成します。名称のみ必須です。
              </Text>
              <ChipSelector
                label="カテゴリ（任意）"
                value={newCategoryId}
                onChange={setNewCategoryId}
                allowClear
                options={(categoriesQuery.data ?? []).map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
              <ChipSelector
                label="設置場所（任意）"
                value={newLocationId}
                onChange={setNewLocationId}
                allowClear
                options={(locationsQuery.data ?? []).map((l) => ({ value: l.id, label: l.name }))}
              />
            </Card>
          )}
        </Section>

        <Section title="2. AI調査用プロンプト生成">
          <TextField label="名称" value={assetName} onChangeText={setAssetName} />
          <ChipSelector
            label="管理対象種別"
            options={ASSET_TYPES.map((t) => ({ value: t, label: ASSET_TYPE_LABELS[t] }))}
            value={assetType}
            onChange={(v) => v && setAssetType(v)}
          />
          <TextField label="メーカー" value={manufacturer} onChangeText={setManufacturer} />
          <TextField label="型番" value={modelNumber} onChangeText={setModelNumber} />
          <TextField label="カテゴリ" value={category} onChangeText={setCategory} />
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

        <Section title="3. AI回答JSONを貼り付け">
          <TextField
            label="AIからの回答（JSON）"
            value={rawJson}
            onChangeText={setRawJson}
            multiline
            style={{ minHeight: 200 }}
            placeholder='{"asset": {...}, "specs": [...], ...}'
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button
            title="解析してプレビュー"
            onPress={() => parseMutation.mutate()}
            loading={parseMutation.isPending}
            variant="outline"
          />
        </Section>

        {previewPayload ? (
          <Section title="4. 取り込みプレビュー">
            <Card>
              {mode === 'apply' && (
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>既存値を上書きする</Text>
                  <Switch value={overwrite} onValueChange={setOverwrite} />
                </View>
              )}
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  スペックを反映 ({previewPayload.specs?.length ?? 0}件)
                </Text>
                <Switch value={applySpecs} onValueChange={setApplySpecs} />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  リンクを反映 ({previewPayload.links?.length ?? 0}件)
                </Text>
                <Switch value={applyLinks} onValueChange={setApplyLinks} />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  消耗品を反映 ({previewPayload.consumables?.length ?? 0}件)
                </Text>
                <Switch value={applyConsumables} onValueChange={setApplyConsumables} />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  付属品を反映 ({previewPayload.accessories?.length ?? 0}件)
                </Text>
                <Switch value={applyAccessories} onValueChange={setApplyAccessories} />
              </View>
            </Card>

            {previewPayload.asset && (
              <Card>
                <Text style={styles.previewTitle}>基本情報</Text>
                {previewPayload.asset.name ? <Text>名称: {previewPayload.asset.name}</Text> : null}
                {previewPayload.asset.asset_type ? (
                  <Text>種別: {previewPayload.asset.asset_type}</Text>
                ) : null}
                {previewPayload.asset.manufacturer ? (
                  <Text>メーカー: {previewPayload.asset.manufacturer}</Text>
                ) : null}
                {previewPayload.asset.model_number ? (
                  <Text>型番: {previewPayload.asset.model_number}</Text>
                ) : null}
                {previewPayload.asset.summary ? (
                  <Text style={{ color: COLORS.textSub, marginTop: 4 }}>
                    {previewPayload.asset.summary}
                  </Text>
                ) : null}
              </Card>
            )}

            {(previewPayload.specs ?? []).length > 0 && (
              <Card>
                <Text style={styles.previewTitle}>スペック・仕様</Text>
                {previewPayload.specs!.map((s, i) => (
                  <Text key={i}>
                    ・ {s.spec_name}: {s.spec_value ?? '—'} {s.unit ?? ''}
                  </Text>
                ))}
              </Card>
            )}

            {(previewPayload.links ?? []).length > 0 && (
              <Card>
                <Text style={styles.previewTitle}>関連リンク</Text>
                {previewPayload.links!.map((l, i) => (
                  <Text key={i} numberOfLines={2}>
                    ・ [{l.link_type}] {l.title ?? l.url}
                  </Text>
                ))}
              </Card>
            )}

            {(previewPayload.consumables ?? []).length > 0 && (
              <Card>
                <Text style={styles.previewTitle}>消耗品</Text>
                {previewPayload.consumables!.map((c, i) => (
                  <Text key={i}>・ {c.name}</Text>
                ))}
              </Card>
            )}

            {(previewPayload.accessories ?? []).length > 0 && (
              <Card>
                <Text style={styles.previewTitle}>付属品</Text>
                {previewPayload.accessories!.map((a, i) => (
                  <Text key={i}>
                    ・ {a.name} {a.quantity != null ? `× ${a.quantity}` : ''}
                  </Text>
                ))}
              </Card>
            )}

            {(previewPayload.notes ?? []).length > 0 && (
              <Card>
                <Text style={styles.previewTitle}>注意事項</Text>
                {previewPayload.notes!.map((n, i) => (
                  <Text key={i}>・ {n}</Text>
                ))}
              </Card>
            )}

            {mode === 'apply' ? (
              <Button
                title="この内容で資産に反映"
                onPress={() => applyMutation.mutate()}
                loading={applyMutation.isPending}
                disabled={!targetAssetId}
              />
            ) : (
              <Button
                title="この内容で新しい資産を作成"
                onPress={() => createMutation.mutate()}
                loading={createMutation.isPending}
                disabled={!assetName.trim() && !previewPayload.asset?.name?.trim()}
              />
            )}
          </Section>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, backgroundColor: COLORS.bg, paddingBottom: SPACING.xxl },
  targetName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  changeText: { color: COLORS.primary, marginTop: 4, fontWeight: '600' },
  helperText: { color: COLORS.textSub, marginBottom: SPACING.sm },
  assetRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  assetRowName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  assetRowMeta: { fontSize: 12, color: COLORS.textSub },
  promptText: {
    backgroundColor: '#FAFAFA',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    fontSize: 12,
    color: COLORS.textSub,
    marginBottom: SPACING.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchLabel: { fontSize: 13, color: COLORS.text },
  previewTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  modeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  modeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  modeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modeChipText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  modeChipTextActive: { color: '#fff' },
});

export default AiImportScreen;
